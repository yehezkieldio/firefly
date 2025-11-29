import { okAsync } from "neverthrow";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import { runChecks } from "#/task-system/task-helpers";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import { conflictErrAsync, ensureNotAsync, type FireflyAsyncResult, type FireflyResult } from "#/utils/result";

const CLIFF_CONFIG_FILE = "cliff.toml";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

function checkCliffConfig(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.fs
        .exists(CLIFF_CONFIG_FILE)
        .andThen((exists) =>
            ensureNotAsync(!exists, {
                message: `Configuration file "${CLIFF_CONFIG_FILE}" not found. See: https://git-cliff.org/docs/usage/initializing`,
                source: "commands/release/preflight",
            })
        )
        .map(() => logger.verbose(`  ✓ Found ${CLIFF_CONFIG_FILE}`));
}

function checkGitRepository(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git
        .isRepository()
        .andThen((isRepo) =>
            ensureNotAsync(!isRepo, {
                message: "Not inside a git repository. Initialize a git repository first.",
                source: "commands/release/preflight",
            })
        )
        .map(() => logger.verbose("  ✓ Inside git repository"));
}

function checkCleanWorkingDirectory(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git.status().andThen((status) => {
        if (!status.isClean) {
            const issues: string[] = [];
            if (status.hasStaged) issues.push("staged changes");
            if (status.hasUnstaged) issues.push("unstaged changes");
            if (status.hasUntracked) issues.push("untracked files");

            return conflictErrAsync({
                message: `Working directory is not clean. Found: ${issues.join(", ")}. Commit or stash changes first.`,
                source: "commands/release/preflight",
                details: status,
            });
        }
        logger.verbose("  ✓ Working directory is clean");
        return okAsync(undefined);
    });
}

function checkUnpushedCommits(ctx: ReleaseContext): FireflyAsyncResult<void> {
    return ctx.services.git
        .unpushedCommits()
        .andThen((result) =>
            ensureNotAsync(result.hasUnpushed, {
                message: `Found ${result.count} unpushed commit(s). Push changes before releasing.`,
                source: "commands/release/preflight",
            })
        )
        .map(() => logger.verbose("  ✓ No unpushed commits"));
}

export function createReleasePreflightTask(skipCondition: () => boolean): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("release-preflight")
        .description("Validate git repository status and prerequisites")
        .skipWhen(skipCondition)
        .execute((ctx) => {
            logger.info("Running preflight checks...");

            return runChecks(
                ctx,
                checkCliffConfig,
                checkGitRepository,
                checkCleanWorkingDirectory,
                checkUnpushedCommits
            ).map((c) => {
                logger.info("Preflight checks passed!");
                return c;
            });
        })
        .build();
}
