import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class StageChangesTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "stage-changes";
    readonly description = "Stages the changes for the release.";

    getDependencies(): string[] {
        return [taskRef(WriteChangelogFileTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(CommitChangesTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
