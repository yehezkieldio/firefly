import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks/changelog-flow-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { InitializeCurrentVersionTask, PromptBumpStrategyTask, StraightBumpTask } from "#/modules/semver/tasks";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class VersionFlowControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "version-flow-controller";
    readonly description = "Controls the flow between version bump and subsequent tasks based on configuration.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }

        const nextTasks: string[] = [];
        if (config.releaseType !== undefined) {
            nextTasks.push(taskRef(StraightBumpTask));
        } else {
            nextTasks.push(taskRef(PromptBumpStrategyTask));
        }

        return ok(nextTasks);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
