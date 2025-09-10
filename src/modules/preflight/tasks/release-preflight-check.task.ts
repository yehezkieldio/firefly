import { join } from "node:path";
import { ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { GitProvider } from "#/modules/git/git.provider";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ReleasePreflightCheckTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "release-preflight-check";
    readonly description = "Perform preflight checks before starting the release command.";

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        if (context?.getConfig().skipPreflightCheck) {
            return ok(false);
        }

        return ok(true);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        if (context?.getConfig().skipPreflightCheck) {
            return ok([taskRef(InitializeCurrentVersionTask)]);
        }

        return ok([]);
    }

    canUndo(): boolean {
        return false;
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        logger.verbose("ReleasePreflightCheckTask: Starting preflight checks...");

        const basePath = context.getBasePath();
        return this.checkGitCliffConfig(basePath)
            .andThen(this.cleanWorkingDirectory)
            .andThen(this.ensureNoUnpushedCommits)
            .map(() => logger.verbose("ReleasePreflightCheckTask: All preflight checks passed."));
    }

    private checkGitCliffConfig(basePath: string): FireflyAsyncResult<GitProvider> {
        logger.verbose("ReleasePreflightCheckTask: Checking for git-cliff configuration...");

        const existsResult = FileSystemService.exists(join(basePath, "cliff.toml"));
        return ResultAsync.fromPromise(existsResult, toFireflyError).andThen((exists) => {
            if (exists.isErr()) {
                return errAsync(exists.error);
            }

            if (!exists.value) {
                return errAsync(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: "No git-cliff configuration found!",
                    }),
                );
            }

            return okAsync(new GitProvider());
        });
    }

    private cleanWorkingDirectory(gitProvider: GitProvider): FireflyAsyncResult<GitProvider> {
        logger.verbose("ReleasePreflightCheckTask: Checking if working directory is clean...");

        return ResultAsync.fromPromise(gitProvider.status.isWorkingDirectoryClean(), toFireflyError).andThen(
            (isCleanResult) => {
                if (isCleanResult.isErr()) {
                    return err(isCleanResult.error);
                }

                if (!isCleanResult.value) {
                    return err(
                        createFireflyError({
                            code: "FAILED",
                            message: "Working directory is not clean, clean working directory before proceeding!",
                        }),
                    );
                }

                logger.verbose("ReleasePreflightCheckTask: Working directory is clean");
                return ok(gitProvider);
            },
        );
    }

    private ensureNoUnpushedCommits(gitProvider: GitProvider): FireflyAsyncResult<void> {
        logger.verbose("ReleasePreflightCheckTask: Checking for unpushed commits...");

        return ResultAsync.fromPromise(gitProvider.remote.hasUnpushedCommits(), toFireflyError).andThen(
            (unpushedResult) => {
                if (unpushedResult.isErr()) {
                    return err(unpushedResult.error);
                }

                if (unpushedResult.value) {
                    logger.verbose("ReleasePreflightCheckTask: There are unpushed commits");
                    return err(
                        createFireflyError({
                            code: "FAILED",
                            message: "There are unpushed commits, push them before proceeding!",
                        }),
                    );
                }

                logger.verbose("ReleasePreflightCheckTask: No unpushed commits found");
                return ok(undefined);
            },
        );
    }
}
