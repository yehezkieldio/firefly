import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PublishGitHubReleaseTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "publish-github-release";
    readonly description = "Publishes the release on GitHub.";

    getDependencies(): string[] {
        return [taskRef(PlatformPublishControllerTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        if (context.getConfig().skipGitHubRelease) {
            return ok(false);
        }

        return ok(true);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
