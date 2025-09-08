import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class CreateTagTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "create-tag";
    readonly description = "Creates a new tag for the release.";

    getDependencies(): string[] {
        return [taskRef(CommitChangesTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(PushCommitTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
