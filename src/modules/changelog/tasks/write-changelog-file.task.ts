import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks/generate-changelog.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class WriteChangelogFileTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "write-changelog-file";
    readonly description = "Writes the changelog file based on the current release context.";

    getDependencies(): string[] {
        return [taskRef(GenerateChangelogTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipChangelog);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(GitFlowControllerTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
