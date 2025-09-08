import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PushTagTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "push-tag";
    readonly description = "Pushes the tag to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(PushCommitTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(PlatformPublishControllerTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
