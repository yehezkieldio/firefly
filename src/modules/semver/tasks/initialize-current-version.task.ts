import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ReleasePreflightCheckTask } from "#/modules/configuration/tasks/release-preflight-check.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class InitializeCurrentVersionTask implements Task<ReleaseTaskContext> {
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version from package.json or initializes it to 0.0.0.";

    getDependencies(): string[] {
        return [taskRef(ReleasePreflightCheckTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
