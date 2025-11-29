import { errAsync, okAsync } from "neverthrow";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyResult } from "#/utils/result";

const CLIFF_CONFIG_FILE = "cliff.toml";

type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData>;

function checkCliffConfig(ctx: ReleaseContext) {
    return ctx.services.fs.exists(CLIFF_CONFIG_FILE).andThen((exists) => {
        if (!exists) {
            return errAsync(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Configuration file "${CLIFF_CONFIG_FILE}" not found. Run "git-cliff --init" to create one.`,
                    source: "commands/release/preflight",
                })
            );
        }
        logger.verbose(`  ✓ Found ${CLIFF_CONFIG_FILE}`);
        return okAsync(true);
    });
}

function checkGitRepository(ctx: ReleaseContext) {
    return ctx.services.git.isRepository().andThen((isRepo) => {
        if (!isRepo) {
            return errAsync(
                createFireflyError({
                    code: "VALIDATION",
                    message: "Not inside a git repository. Initialize a git repository first.",
                    source: "commands/release/preflight",
                })
            );
        }
        logger.verbose("  ✓ Inside git repository");
        return okAsync(true);
    });
}

function checkCleanWorkingDirectory(ctx: ReleaseContext) {
    return ctx.services.git.status().andThen((status) => {
        if (!status.isClean) {
            const issues: string[] = [];
            if (status.hasStaged) issues.push("staged changes");
            if (status.hasUnstaged) issues.push("unstaged changes");
            if (status.hasUntracked) issues.push("untracked files");

            return errAsync(
                createFireflyError({
                    code: "CONFLICT",
                    message: `Working directory is not clean. Found: ${issues.join(", ")}. Commit or stash changes first.`,
                    source: "commands/release/preflight",
                    details: status,
                })
            );
        }
        logger.verbose("  ✓ Working directory is clean");
        return okAsync(true);
    });
}

function checkUnpushedCommits(ctx: ReleaseContext) {
    return ctx.services.git.unpushedCommits().andThen((result) => {
        if (result.hasUnpushed) {
            return errAsync(
                createFireflyError({
                    code: "CONFLICT",
                    message: `Found ${result.count} unpushed commit(s). Push changes before releasing.`,
                    source: "commands/release/preflight",
                    details: result,
                })
            );
        }
        logger.verbose("  ✓ No unpushed commits");
        return okAsync(true);
    });
}

export function createPreflightTask(skipCondition: () => boolean): FireflyResult<Task> {
    return TaskBuilder.create("release-preflight")
        .description("Validate git repository status and prerequisites")
        .skipWhen(skipCondition)
        .execute((ctx) => {
            logger.info("Running preflight checks...");

            return checkCliffConfig(ctx as ReleaseContext)
                .andThen(() => checkGitRepository(ctx as ReleaseContext))
                .andThen(() => checkCleanWorkingDirectory(ctx as ReleaseContext))
                .andThen(() => checkUnpushedCommits(ctx as ReleaseContext))
                .andThen(() => {
                    logger.info("Preflight checks passed!");
                    return okAsync(ctx);
                });
        })
        .build();
}
