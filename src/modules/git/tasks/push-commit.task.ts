import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CreateTagTask } from "#/modules/git/tasks/create-tag.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class PushCommitTask implements Task<ReleaseTaskContext> {
    readonly id = "push-commit";
    readonly description = "Pushes the commit to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(CreateTagTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
