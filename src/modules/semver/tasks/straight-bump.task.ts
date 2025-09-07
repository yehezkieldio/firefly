import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class StraightBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "straight-bump";
    readonly description = "Handles direct version bumping without any prompts or strategies.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        if (config.releaseType !== undefined) {
            return ok(true);
        }

        return ok(false);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(BumpVersionTask)]);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }
        return ok([taskRef(VersionFlowControllerTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
