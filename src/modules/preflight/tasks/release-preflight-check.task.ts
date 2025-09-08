import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ReleasePreflightCheckTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "release-preflight-check";
    readonly description = "Perform preflight checks before starting the release command.";

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        if (context?.getConfig().skipPreflightCheck) {
            return ok(false);
        }

        return ok(true);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        if (context?.getConfig().skipPreflightCheck) {
            return ok([taskRef(InitializeCurrentVersionTask)]);
        }

        return ok([]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
