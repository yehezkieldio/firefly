/**
 * Push Tag Task
 *
 * Pushes the release tag to the remote repository.
 * Handles remote detection with fallback to 'origin'.
 *
 * @module commands/release/tasks/push-tag
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { IGitService } from "#/services/interfaces";
import type { ResolvedServices } from "#/services/service-registry";
import { resolveTemplateString } from "#/services/template-service";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { executeGitCommand } from "#/utils/git-command-executor";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, FireflyOkAsync, type FireflyResult, notFoundErrAsync } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

/** Default remote name when detection fails */
const DEFAULT_REMOTE = "origin";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detects the current git remote name with fallback to 'origin'.
 *
 * @param git - Git service instance
 * @returns Remote name or 'origin' as fallback
 */
function detectRemote(git: IGitService): FireflyAsyncResult<string> {
    return git
        .getRemoteUrl()
        .map(() => DEFAULT_REMOTE)
        .orElse(() => FireflyOkAsync(DEFAULT_REMOTE));
}

/**
 * Resolves the tag name using template placeholders.
 *
 * Supported placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope if present)
 * - {{unscopedName}} - Package name without scope
 *
 * @param ctx - Workflow context with configuration and data
 * @returns Resolved tag name string
 */
function resolveTagName(ctx: ReleaseContext): string {
    const { config, data } = ctx;

    return resolveTemplateString(config.tagName, {
        version: data.nextVersion,
        name: config.name,
        scope: config.scope,
    });
}

/**
 * Pushes a specific tag to the remote repository.
 *
 * @param tagName - Name of the tag to push
 * @param remote - Remote name to push to
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function pushTag(tagName: string, remote: string, dryRun?: boolean): FireflyAsyncResult<void> {
    if (dryRun) {
        logger.verbose(`[push-tag] Dry run: would push tag ${tagName} to ${remote}`);
        return FireflyOkAsync(undefined);
    }

    return executeGitCommand(["push", remote, tagName], { verbose: false }).andThen(() => {
        logger.verbose(`[push-tag] Pushed tag ${tagName} to ${remote}`);
        return FireflyOkAsync(undefined);
    });
}

/**
 * Deletes a tag from the remote repository.
 * Used for undo operations to roll back tag pushes.
 *
 * @param tagName - Name of the tag to delete
 * @param remote - Remote name to delete from
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function deleteRemoteTag(tagName: string, remote: string, dryRun?: boolean): FireflyAsyncResult<void> {
    if (dryRun) {
        logger.verbose(`[push-tag] Dry run: would delete remote tag ${tagName} from ${remote}`);
        return FireflyOkAsync(undefined);
    }

    // Use the refs syntax to delete a remote tag: push :refs/tags/<tagName>
    return executeGitCommand(["push", remote, `:refs/tags/${tagName}`], { verbose: false }).andThen(() => {
        logger.verbose(`[push-tag] Deleted remote tag ${tagName} from ${remote}`);
        return FireflyOkAsync(undefined);
    });
}

/**
 * Executes the push tag operation with proper validation and logging.
 *
 * @param ctx - Workflow context
 * @returns Updated context after pushing the tag
 */
function executePushTag(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const { data, services } = ctx;
    const { git } = services;

    if (!data.nextVersion) {
        return notFoundErrAsync({
            message: "No next version found in context. Ensure bump task has run.",
            source: "push-tag.execute",
        });
    }

    const tagName = resolveTagName(ctx);

    logger.info("[push-tag] Pushing release tag to remote...");
    logger.verbose(`[push-tag] Tag name: ${colors.gray(tagName)}`);

    return detectRemote(git).andThen((remote) => {
        logger.verbose(`[push-tag] Using remote: ${colors.gray(remote)}`);

        return pushTag(tagName, remote, data.dryRun).map(() => {
            logger.success(`[push-tag] Pushed tag ${colors.cyan(tagName)} to ${colors.cyan(remote)}`);
            return ctx;
        });
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Push Tag Task.
 *
 * This task pushes the release tag to the remote repository.
 * It automatically detects the remote name and falls back to 'origin' if detection fails.
 *
 * **Dependencies:** push-commit (ensures commit is pushed before tag)
 *
 * **Skipped when:**
 * - skipGit is enabled
 * - skipPush is enabled
 * - Both skipBump and skipChangelog are enabled (no tag to push)
 *
 * **Undo:** Deletes the tag from the remote using `git push <remote> :refs/tags/<tagName>`
 */
export function createPushTagTask(): FireflyResult<Task> {
    /** Captured for undo operation - stores the tag name and remote */
    let capturedTagName: string | undefined;
    let capturedRemote: string | undefined;

    return TaskBuilder.create<ReleaseContext>("push-tag")
        .description("Pushes the release tag to remote")
        .dependsOn("push-commit")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || ctx.config.skipPush || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit, skipPush, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            // Capture tag name for potential undo
            capturedTagName = resolveTagName(ctx);

            return detectRemote(ctx.services.git).andThen((remote) => {
                capturedRemote = remote;
                return executePushTag(ctx);
            });
        })
        .withUndo((ctx) => {
            if (capturedTagName === undefined || capturedRemote === undefined) {
                logger.verbose("[push-tag] No tag name or remote captured, skipping undo");
                return FireflyOkAsync(undefined);
            }

            const tagName = capturedTagName;
            const remote = capturedRemote;

            logger.verbose(`[push-tag] Undoing: deleting tag ${tagName} from ${remote}...`);

            return deleteRemoteTag(tagName, remote, ctx.data.dryRun).andThen(() => {
                logger.verbose(`[push-tag] Undo complete: tag ${tagName} deleted from remote`);
                return FireflyOkAsync(undefined);
            });
        })
        .build();
}
