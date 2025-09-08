import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_MANUAL } from "#/modules/semver/constants/bump-strategy.constant";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { PromptManualVersionTask } from "#/modules/semver/tasks/prompt-manual-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ManualBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "manual-bump";
    readonly description = "Allows the user to manually select the version bump type";

    getDependencies(): string[] {
        return [taskRef(PromptManualVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(config.bumpStrategy === BUMP_STRATEGY_MANUAL);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(BumpVersionTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
