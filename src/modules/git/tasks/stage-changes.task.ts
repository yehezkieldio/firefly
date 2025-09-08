import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class StageChangesTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "stage-changes";
    readonly description = "Stages the changes for the release.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        if (context?.getConfig().skipChangelog) {
            return [taskRef(GitFlowControllerTask)];
        }

        return [taskRef(WriteChangelogFileTask)];
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

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
