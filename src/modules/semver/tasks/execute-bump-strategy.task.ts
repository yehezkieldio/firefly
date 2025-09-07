import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ExecuteBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "execute-bump-strategy";
    readonly name = "Execute Bump Strategy";
    readonly description = "Executes the selected bump strategy to determine the new version.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const hasReleaseType = Boolean(config.releaseType);
        const hasBumpStrategy = Boolean(config.bumpStrategy);

        // Execute if releaseType is not defined but bumpStrategy is defined
        const shouldExecute = !hasReleaseType && hasBumpStrategy;
        return ok(shouldExecute);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const strategy = context.getConfig().bumpStrategy;

        if (strategy === "manual") {
            return ok(["prompt-manual-version"]);
        }

        if (strategy === "auto") {
            return ok(["automatic-bump"]);
        }

        return ok([]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
