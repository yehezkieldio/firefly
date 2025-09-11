import { basename, resolve } from "node:path";
import { colors } from "consola/utils";
import { ResultAsync, errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks";
import { GitProvider } from "#/modules/git/git.provider";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";
import { wrapPromise } from "#/shared/utils/result.util";

export class StageChangesTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "stage-changes";
    readonly description = "Stages the changes for the release.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        if (context?.getConfig().skipChangelog) {
            return [taskRef(GitFlowControllerTask)];
        }

        return [taskRef(GenerateChangelogTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipGit);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGit) {
            return ok([]);
        }

        return ok([taskRef(CommitChangesTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const config = context.getConfig();
        const changelogPath = config.changelogPath || "CHANGELOG.md";

        const packageJsonPath = resolve(context.getBasePath(), "package.json");
        const fullChangelogPath = resolve(context.getBasePath(), changelogPath);

        const gitProvider = GitProvider.getInstance();

        logger.info(
            `Staging changes for ${colors.underline(basename(packageJsonPath))} and ${colors.underline(basename(fullChangelogPath))}`,
        );
        return wrapPromise(
            gitProvider.status.getUnstagedFilesByNames([fullChangelogPath, packageJsonPath], config.dryRun),
        ).andThen((filesResult) => {
            if (filesResult.isErr()) {
                return errAsync(filesResult.error);
            }

            const files = filesResult.value;

            logger.verbose(`StageChangesTask: Found ${files.length} files to stage: ${files.join(", ")}`);

            if (files.length === 0) {
                logger.verbose("StageChangesTask: No changes detected to stage, continuing...");
                return ResultAsync.fromSafePromise(Promise.resolve());
            }

            return wrapPromise(gitProvider.staging.stageFiles(files, config.dryRun))
                .andTee((result) => {
                    if (result.isErr()) {
                        logger.error(`Failed to stage files: ${files.join(", ")}. Error: ${result.error.message}`);
                    } else {
                        logger.verbose(`StageChangesTask: Staged files: ${files.join(", ")}`);
                    }
                })
                .map(() => {});
        });
    }
}
