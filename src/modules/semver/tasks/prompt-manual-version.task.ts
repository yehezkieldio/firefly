import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_MANUAL } from "#/modules/semver/constants/bump-strategy.constant";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { ManualBumpTask } from "#/modules/semver/tasks/manual-bump.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptManualVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-manual-version";
    readonly description = "Prompts the user to manually enter the desired version";

    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(config.bumpStrategy === BUMP_STRATEGY_MANUAL);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(ManualBumpTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
