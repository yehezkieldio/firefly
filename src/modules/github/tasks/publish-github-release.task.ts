import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PushTagTask } from "#/modules/git/tasks";
import type { ConditionalTask, Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PublishGitHubReleaseTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "publish-github-release";
    readonly description = "Publishes the release on GitHub.";

    getDependencies(): string[] {
        return [taskRef(PushTagTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
