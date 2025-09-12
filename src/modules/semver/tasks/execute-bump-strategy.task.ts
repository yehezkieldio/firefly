import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL } from "#/modules/semver/constants/bump-strategy.constant";
import { AutomaticBumpTask } from "#/modules/semver/tasks/automatic-bump.task";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { PromptManualVersionTask } from "#/modules/semver/tasks/prompt-manual-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ExecuteBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "execute-bump-strategy";
    readonly description = "Executes the selected bump strategy to determine the new version.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        const shouldRun = !config.releaseType && Boolean(config.bumpStrategy);
        return ok(shouldRun);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const strategy = context.getConfig().bumpStrategy;

        if (strategy === BUMP_STRATEGY_MANUAL) {
            return ok([taskRef(PromptManualVersionTask)]);
        }
        if (strategy === BUMP_STRATEGY_AUTO) {
            return ok([taskRef(AutomaticBumpTask)]);
        }

        return ok([]);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        const strategy = config.bumpStrategy;

        if (strategy === BUMP_STRATEGY_MANUAL) {
            return ok([taskRef(PromptManualVersionTask)]);
        }
        if (strategy === BUMP_STRATEGY_AUTO) {
            return ok([taskRef(AutomaticBumpTask)]);
        }

        return ok([taskRef(BumpVersionTask)]);
    }

    execute(): FireflyAsyncResult<void> {
        return okAsync();
    }
}
