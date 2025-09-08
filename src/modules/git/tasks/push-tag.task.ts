import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PushTagTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "push-tag";
    readonly description = "Pushes the tag to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(PushCommitTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!(config.skipPush || config.skipGit));
    }

    getNextTasks(_context: ReleaseTaskContext): FireflyResult<string[]> {
        return ok([]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
