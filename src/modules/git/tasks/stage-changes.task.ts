import { basename } from "node:path";
import { ResultAsync, errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks";
import { GitProvider } from "#/modules/git/git.provider";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { createFireflyError } from "#/shared/utils/error.util";
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
        const changelogPath = context.getConfig().changelogPath || "CHANGELOG.md";
        const changelogFileName = basename(changelogPath);
        const gitProvider = GitProvider.getInstance();

        return wrapPromise(
            gitProvider.status.getModifiedFilesByNames(["package.json", changelogFileName], context.getConfig().dryRun),
        ).andThen((filesResult) => {
            if (filesResult.isErr()) {
                return errAsync(filesResult.error);
            }

            const files = filesResult.value;
            if (files.length === 0) {
                return errAsync(
                    createFireflyError({
                        message: "No changes detected to stage.",
                        code: "NOT_FOUND",
                    }),
                );
            }

            // Stage files sequentially
            const stagePromises = files.map((file) =>
                wrapPromise(gitProvider.staging.stageFile(file, context.getConfig().dryRun)),
            );

            return ResultAsync.combine(stagePromises).map(() => {});
        });
    }
}
