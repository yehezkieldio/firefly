import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { CommitChangesTask, CreateTagTask, PushCommitTask, PushTagTask, StageChangesTask } from "#/modules/git/tasks";
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

        if (config.skipGit) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        const nextTasks: string[] = [];

        const shouldStage = !config.skipCommit;
        const shouldCommit = !config.skipCommit && shouldStage;
        const shouldTag = !config.skipTag && shouldCommit;
        const shouldPushCommit = !config.skipPush && shouldCommit;
        const shouldPushTag = !config.skipPush && shouldTag;

        if (shouldStage) {
            nextTasks.push(taskRef(StageChangesTask));
        }

        if (shouldCommit) {
            nextTasks.push(taskRef(CommitChangesTask));
        }

        if (shouldTag) {
            nextTasks.push(taskRef(CreateTagTask));
        }

        if (shouldPushCommit) {
            nextTasks.push(taskRef(PushCommitTask));
        }

        if (shouldPushTag) {
            nextTasks.push(taskRef(PushTagTask));
        }

        nextTasks.push(taskRef(PlatformPublishControllerTask));

        return ok(nextTasks);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
