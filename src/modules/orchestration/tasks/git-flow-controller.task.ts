import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks";
import { StageChangesTask } from "#/modules/git/tasks";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks/changelog-flow-controller.task";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks/platform-publish-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class GitFlowControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "git-flow-controller";
    readonly description = "Controls the flow for git operations based on configuration.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        const config = context?.getConfig();

        // if skipbump, skipchangelog, and skipgit are all true, skip this task entirely
        if (config?.skipBump && config?.skipChangelog && config?.skipGit) {
            return [taskRef(ChangelogFlowControllerTask)];
        }

        if (config?.skipChangelog) {
            return [taskRef(ChangelogFlowControllerTask)];
        }

        return [taskRef(GenerateChangelogTask)];
    }

    shouldExecute(context?: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context?.getConfig();
        if (config?.skipBump && config?.skipChangelog && config?.skipGit) {
            return ok(false);
        }
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGit) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        return ok([taskRef(StageChangesTask)]);
    }

    getSkipThroughTasks(context?: ReleaseTaskContext | undefined): FireflyResult<string[]> {
        const config = context?.getConfig();

        if (config?.skipBump && config?.skipChangelog && config?.skipGit) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        return ok([]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
