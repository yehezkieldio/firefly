import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks";
import { CreateTagTask, PushTagTask } from "#/modules/git/tasks";
import { PublishGitHubReleaseTask } from "#/modules/github/tasks";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks/changelog-flow-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PlatformPublishControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "platform-publish-controller";
    readonly description = "Controls the flow for platform publish based on configuration.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        const config = context?.getConfig();

        if (config?.skipBump && config?.skipChangelog && config?.skipGit) {
            return [taskRef(ChangelogFlowControllerTask)];
        }

        // If GitHub release is skipped, no dependencies needed
        if (config?.skipGitHubRelease) {
            return [];
        }

        // If git operations are skipped, depend on GenerateChangelogTask instead
        if (config?.skipGit) {
            return [taskRef(GenerateChangelogTask)];
        }

        // If push is skipped, depend on CreateTagTask instead
        if (config?.skipPush) {
            return [taskRef(CreateTagTask)];
        }

        return [taskRef(PushTagTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context?.getConfig();

        // Don't execute if GitHub release is skipped
        if (config.skipGitHubRelease) {
            return ok(false);
        }

        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        // Don't execute GitHub release if it's skipped
        if (config.skipGitHubRelease) {
            return ok([]);
        }

        return ok([taskRef(PublishGitHubReleaseTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
