/**
 * Commit Changes Task
 *
 * Creates a release commit with the configured commit message.
 * The commit message supports template placeholders for dynamic content.
 *
 * @module commands/release/tasks/commit-changes
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolves the commit message using template placeholders.
 *
 * Supported placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope if present)
 * - {{unscopedName}} - Package name without scope
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
 * Creates a git commit with the specified message.
 *
 * @param ctx - Workflow context with services
 * @param message - Commit message to use
 * @returns Async result with commit SHA or error
 */
function createCommit(ctx: ReleaseContext, message: string): FireflyAsyncResult<string> {
    const { git } = ctx.services;
    const dryRun = ctx.data.dryRun;

    return git.commit(message, { dryRun }).map((result) => result.sha);
}

/**
 * Resets the last commit without discarding changes.
 * This is used for undo operations to roll back the release commit.
 *
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function resetLastCommit(dryRun?: boolean): FireflyAsyncResult<void> {
    if (dryRun) {
        logger.verbose("[commit-changes] Dry run: would reset last commit");
        return FireflyOkAsync(undefined);
    }

    return executeGitCommand(["reset", "--soft", "HEAD~1"], { verbose: false }).andThen(() => {
        logger.verbose("[commit-changes] Last commit reset successfully");
        return FireflyOkAsync(undefined);
    });
}

/**
 * Executes the commit operation with proper validation and logging.
 *
 * @param ctx - Workflow context
 * @returns Updated context after committing
 */
function executeCommit(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const { data } = ctx;

    if (!data.nextVersion) {
        return notFoundErrAsync({
            message: "No next version found in context. Ensure bump task has run.",
            source: "commit-changes.execute",
        });
    }

    const commitMessage = resolveCommitMessage(ctx);
    logger.info("[commit-changes] Creating release commit...");
    logger.verbose(`[commit-changes] Message: ${colors.gray(commitMessage)}`);

    return createCommit(ctx, commitMessage).map((sha) => {
        logger.success(`[commit-changes] Committed with message: ${colors.gray(commitMessage)}`);
        logger.verbose(`[commit-changes] Commit SHA: ${sha}`);
        return ctx;
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Commit Changes Task.
 *
 * This task creates a release commit with the configured message template.
 * The commit message supports template placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope)
 * - {{unscopedName}} - Package name without scope
 *
 * **Dependencies:** stage-changes (ensures files are staged first)
 *
 * **Skipped when:** skipGit is enabled, or both skipBump and skipChangelog are enabled
 *
 * **Undo:** Resets the commit using `git reset --soft HEAD~1` to preserve changes
 */
export function createCommitChangesTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("commit-changes")
        .description("Creates a release commit")
        .dependsOn("stage-changes")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute(executeCommit)
        .withUndo((ctx) => {
            logger.verbose("[commit-changes] Undoing: resetting last commit...");
            return resetLastCommit(ctx.data.dryRun).andThen(() => {
                logger.verbose("[commit-changes] Undo complete: commit reset");
                return FireflyOkAsync(undefined);
            });
        })
        .build();
}
