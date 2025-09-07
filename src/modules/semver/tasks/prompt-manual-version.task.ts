import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptManualVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-manual-version";
    readonly description = "Prompts the user to input the desired version when manual bump strategy is selected.";

    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        return ok(config.bumpStrategy === "manual");
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
