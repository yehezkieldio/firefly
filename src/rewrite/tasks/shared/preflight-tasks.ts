/**
 * Shared preflight check tasks.
 * Used by multiple commands to validate environment before execution.
 */

import { okAsync } from "neverthrow";
import { TaskBuilder } from "#/rewrite/task-system/task-builder";
import { GitService } from "#/rewrite/shared/git";
import { logger } from "#/shared/logger";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";

/**
 * Create a task that checks if current directory is a git repository.
 */
export function createGitRepositoryCheckTask(): Task<any, any> {
    return TaskBuilder.create("check-git-repository")
        .description("Verify current directory is a git repository")
        .execute(async (ctx: WorkflowContext<any, any>) => {
            const git = new GitService();
            const result = await git.isRepository();

            if (result.isErr()) {
                logger.error("Failed to check git repository:", result.error.message);
                return result;
            }

            if (!result.value) {
                logger.error("Not a git repository. Please run this command in a git repository.");
                return result;
            }

            logger.info("✓ Git repository check passed");
            return okAsync(ctx);
        })
        .build();
}

/**
 * Create a task that checks for uncommitted changes.
 */
export function createUncommittedChangesCheckTask(options?: { allowUncommitted?: boolean }): Task<any, any> {
    return TaskBuilder.create("check-uncommitted-changes")
        .description("Check for uncommitted changes")
        .skipWhen((ctx) => options?.allowUncommitted ?? false)
        .execute(async (ctx: WorkflowContext<any, any>) => {
            const git = new GitService();
            const result = await git.hasUncommittedChanges();

            if (result.isErr()) {
                logger.error("Failed to check git status:", result.error.message);
                return result;
            }

            if (result.value) {
                logger.warn("⚠ There are uncommitted changes in the repository");
                // Don't fail, just warn
            } else {
                logger.info("✓ No uncommitted changes");
            }

            return okAsync(ctx);
        })
        .build();
}

/**
 * Create a task that checks if remote exists.
 */
export function createRemoteCheckTask(remoteName: string = "origin"): Task<any, any> {
    return TaskBuilder.create("check-remote")
        .description(`Check if remote "${remoteName}" exists`)
        .execute(async (ctx: WorkflowContext<any, any>) => {
            const git = new GitService();
            const result = await git.remoteExists(remoteName);

            if (result.isErr()) {
                logger.error("Failed to check remote:", result.error.message);
                return result;
            }

            if (!result.value) {
                logger.warn(`⚠ Remote "${remoteName}" does not exist`);
            } else {
                logger.info(`✓ Remote "${remoteName}" exists`);
            }

            return okAsync(ctx.fork("remoteExists", result.value));
        })
        .build();
}
