import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { PushCommitTask, StageChangesTask } from "#/modules/git/tasks";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks/platform-publish-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class GitFlowControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "git-flow-controller";
    readonly description = "Controls the flow for git operations based on configuration.";

    getDependencies(): string[] {
        return [taskRef(WriteChangelogFileTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        const nextTasks: string[] = [];

        if (config.skipGit) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        if (!config.skipCommit) {
            nextTasks.push(taskRef(StageChangesTask));
        }

        if (!(config.skipPush || config.skipCommit)) {
            nextTasks.push(taskRef(PushCommitTask));
        }

        if (nextTasks.length === 0) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        return ok(nextTasks);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
