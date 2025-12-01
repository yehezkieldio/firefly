import type { ReleaseContext } from "#/commands/release/release.context";
import { conflictErrAsync, FireflyOk } from "#/core/result/result.constructors";
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
        .isInsideRepository()
        .andThen((isRepo) =>
            ensureNotAsync(!isRepo, {
                message: "We are not inside a git repository!",
            })
        )
        .andTee(() => logger.verbose("ReleasePreflightTask: We are inside a git repository."));
}

/**
 * Checks if the working directory is clean (no uncommitted changes).
 */
function checkCleanWorkingDirectory(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git
        .getStatus()
        .andThen((status) => {
            if (!status.isClean) {
                const issues: string[] = [];
                if (status.hasStaged) issues.push("staged changes");
                if (status.hasUnstaged) issues.push("unstaged changes");
                if (status.hasUntracked) issues.push("untracked files");

                return conflictErrAsync({
                    message: `Working directory is not clean. Found: ${issues.join(", ")}. Commit or stash changes first.`,
                    details: status,
                });
            }
            return FireflyOk(undefined);
        })
        .andTee(() => logger.verbose("ReleasePreflightTask: Working directory is clean."));
}

/**
 * Checks if there are unpushed commits in the current branch.
 */
function checkUnpushedCommits(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git
        .getUnpushedCommits()
        .andThen((result) =>
            ensureNotAsync(result.hasUnpushed, {
                message: `Found ${result.count} unpushed commit(s). Push changes before releasing.`,
                source: "commands/release/preflight",
            })
        )
        .andTee(() => logger.verbose("ReleasePreflightTask: No unpushed commits found."));
}

/**
 * Checks if the `cliff.toml` configuration file exists in the project root.
 */
function checkCliffConfig(ctx: ReleaseContext): FireflyAsyncResult<void> {
    const CLIFF_CONFIG_FILE = "cliff.toml";

    return ctx.services.fs
        .exists(CLIFF_CONFIG_FILE)
        .andThen((exists) =>
            ensureNotAsync(!exists, {
                message: `Configuration file "${CLIFF_CONFIG_FILE}" not found. See: https://git-cliff.org/docs/usage/initializing`,
                source: "commands/release/preflight",
            })
        )
        .andTee(() => logger.verbose(`ReleasePreflightTask: Found "${CLIFF_CONFIG_FILE}" in project root.`));
}

/**
 * Creates the Release Preflight Task.
 *
 * This task checks the environment and prerequisites for a release.
 * It can be conditionally skipped based on the provided skip condition, though not recommended.
 *
 * Skipping this may led to malformed releases or errors during the release process,
 * and generally done for development purposes only or if you know what you are doing.
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
        .execute((ctx) =>
            runChecks(ctx, checkGitRepository, checkCleanWorkingDirectory, checkUnpushedCommits, checkCliffConfig)
        )
        .build();
}
