import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CreateTagTask } from "#/modules/git/tasks/create-tag.task";
import { PushTagTask } from "#/modules/git/tasks/push-tag.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PushCommitTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "push-commit";
    readonly description = "Pushes the commit to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(CreateTagTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!(config.skipPush || config.skipGit));
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipPush || config.skipGit) {
            return ok([]);
        }

        return ok([taskRef(PushTagTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
