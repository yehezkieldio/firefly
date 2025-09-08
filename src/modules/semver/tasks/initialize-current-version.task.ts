import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class InitializeCurrentVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version from package.json or initializes it to 0.0.0.";

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
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
