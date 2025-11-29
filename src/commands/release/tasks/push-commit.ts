/**
 * Push Commit Task
 *
 * Pushes the release commit to the remote repository.
 * Handles remote detection with fallback to 'origin'.
 *
 * @module commands/release/tasks/push-commit
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
 * Pushes the release commit to the remote repository.
 *
 * @param git - Git service instance
 * @param remote - Remote name to push to
 * @param branch - Branch name to push
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function pushCommit(
    git: IGitService,
    remote: string,
    branch: string | undefined,
    dryRun?: boolean
): FireflyAsyncResult<void> {
    return git.push({ remote, branch, dryRun }).andThen(() => FireflyOkAsync(undefined));
}

/**
 * Resolves the commit message using template placeholders.
 *
 * @param ctx - Workflow context with configuration and data
 * @returns Resolved commit message string
 */
function resolveCommitMessage(ctx: ReleaseContext): string {
    const { config, data } = ctx;

    return resolveTemplateString(config.commitMessage, {
        version: data.nextVersion,
        name: config.name,
        scope: config.scope,
    });
}

/**
 * Rolls back the pushed commit by reverting to the previous state.
 * This attempts to reset the remote branch to the state before the push.
 *
 * @param git - Git service instance
 * @param commitMessage - The commit message to match for rollback
 * @param branch - The branch to rollback
 * @param remote - The remote name
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function rollbackPush(
    commitMessage: string,
    branch: string | undefined,
    remote: string,
    dryRun?: boolean
): FireflyAsyncResult<void> {
    if (dryRun) {
        logger.verbose("[push-commit] Dry run: would rollback pushed commit");
        return FireflyOkAsync(undefined);
    }

    // Get the latest commit message to verify it matches
    return executeGitCommand(["log", "-1", "--format=%s"], { verbose: false }).andThen((latestMessage) => {
        const trimmedMessage = latestMessage.trim();

        if (trimmedMessage !== commitMessage) {
            logger.verbose(`[push-commit] Latest commit "${trimmedMessage}" doesn't match expected "${commitMessage}"`);
            logger.verbose("[push-commit] Skipping rollback - commit may have been modified");
            return FireflyOkAsync(undefined);
        }

        // Reset to the commit before HEAD
        return executeGitCommand(["reset", "--hard", "HEAD~1"], { verbose: false }).andThen(() => {
            // Force push to update remote
            const pushArgs = ["push", "--force", remote];
            if (branch) {
                pushArgs.push(branch);
            }
            return executeGitCommand(pushArgs, { verbose: false }).andThen(() => {
                logger.verbose(`[push-commit] Rolled back commit from ${remote}`);
                return FireflyOkAsync(undefined);
            });
        });
    });
}

/**
 * Executes the push commit operation with proper validation and logging.
 *
 * @param ctx - Workflow context
 * @returns Updated context after pushing
 */
function executePushCommit(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const { config, data, services } = ctx;
    const { git } = services;

    if (!data.nextVersion) {
        return notFoundErrAsync({
            message: "No next version found in context. Ensure bump task has run.",
            source: "push-commit.execute",
        });
    }

    logger.info("[push-commit] Pushing release commit to remote...");

    return detectRemote(git).andThen((remote) => {
        logger.verbose(`[push-commit] Using remote: ${colors.gray(remote)}`);

        return pushCommit(git, remote, undefined, data.dryRun).map(() => {
            logger.success(`[push-commit] Pushed commit to ${colors.cyan(remote)}`);
            return ctx;
        });
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Push Commit Task.
 *
 * This task pushes the release commit to the remote repository.
 * It automatically detects the remote name and falls back to 'origin' if detection fails.
 *
 * **Dependencies:** create-tag (ensures tag exists before pushing)
 *
 * **Skipped when:**
 * - skipGit is enabled
 * - skipPush is enabled
 * - Both skipBump and skipChangelog are enabled (no changes to push)
 *
 * **Undo:** Resets the branch to the previous commit and force-pushes
 * if the latest commit message matches the expected release commit.
 */
export function createPushCommitTask(): FireflyResult<Task> {
    /** Captured for undo operation - stores the commit message and remote */
    let capturedCommitMessage: string | undefined;
    let capturedRemote: string | undefined;

    return TaskBuilder.create<ReleaseContext>("push-commit")
        .description("Pushes the release commit to remote")
        .dependsOn("create-tag")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || ctx.config.skipPush || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit, skipPush, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            // Capture commit message for potential undo
            capturedCommitMessage = resolveCommitMessage(ctx);

            return detectRemote(ctx.services.git).andThen((remote) => {
                capturedRemote = remote;
                return executePushCommit(ctx);
            });
        })
        .withUndo((ctx) => {
            if (capturedCommitMessage === undefined || capturedRemote === undefined) {
                logger.verbose("[push-commit] No commit message or remote captured, skipping undo");
                return FireflyOkAsync(undefined);
            }

            const commitMessage = capturedCommitMessage;
            const remote = capturedRemote;

            logger.verbose("[push-commit] Undoing: rolling back pushed commit...");

            return rollbackPush(commitMessage, undefined, remote, ctx.data.dryRun).andThen(() => {
                logger.verbose("[push-commit] Undo complete: commit rolled back from remote");
                return FireflyOkAsync(undefined);
            });
        })
        .build();
}
