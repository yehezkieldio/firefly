import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class AutomaticBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "automatic-bump";
    readonly description = "Uses semantic analysis/recommendation to decide and set the next version automatically.";

    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const strategy = config.bumpStrategy;

        // Only execute if bump strategy is specifically "auto"
        return ok(strategy === "auto");
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok(["bump-version"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
