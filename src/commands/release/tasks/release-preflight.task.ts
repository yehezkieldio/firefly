import type { ReleaseContext } from "#/commands/release/release.context";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { ensureNotAsync } from "#/core/result/result.utilities";
import { TaskBuilder } from "#/core/task/task.builder";
import { runChecks } from "#/core/task/task.helpers";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

/**
 * Checks if the current directory is a git repository.
 */
function checkGitRepository(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git
        .isRepository()
        .andThen((isRepo) =>
            ensureNotAsync(!isRepo, {
                message: "We are not inside a git repository!",
            })
        )
        .map(() => logger.verbose("ReleasePreflightTask: We are inside a git repository."));
}

/**
 * Creates the Release Preflight Task.
 *
 * This task checks the environment and prerequisites for a release.
 * It can be conditionally skipped based on the provided skip condition, though not recommended.
 *
 * This task:
 * 1. Check if its on a git repository
 * 2. Check if on a clean working tree, no uncommitted changes
 * 3. Check if no unpushed commits
 * 4. Check if there is `cliff.toml` file in the project root
 */
export function createReleasePreflightTask(skipCondition: () => boolean): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("release-preflight")
        .description("Validate environment and prerequisites for a release")
        .skipWhen(skipCondition)
        .execute((ctx) => runChecks(ctx, checkGitRepository))
        .build();
}
