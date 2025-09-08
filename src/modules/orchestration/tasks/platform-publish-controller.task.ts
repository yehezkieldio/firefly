import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PushTagTask } from "#/modules/git/tasks";
import { PublishGitHubReleaseTask } from "#/modules/github/tasks";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks/git-flow-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PlatformPublishControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "platform-publish-controller";
    readonly description = "Controls the flow for platform publish based on configuration.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        const config = context?.getConfig();

        if (config?.skipGit) {
            return [taskRef(GitFlowControllerTask)];
        }

        if (config?.skipGitHubRelease) {
            return [];
        }

        return [taskRef(PushTagTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context?.getConfig();

        if (config.skipGitHubRelease) {
            return ok(false);
        }

        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGitHubRelease) {
            return ok([]);
        }

        return ok([taskRef(PublishGitHubReleaseTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
