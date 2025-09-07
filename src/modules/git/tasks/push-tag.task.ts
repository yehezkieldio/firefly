import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class PushTagTask implements Task<ReleaseTaskContext> {
    readonly id = "push-tag";
    readonly description = "Pushes the tag to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(PushCommitTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
