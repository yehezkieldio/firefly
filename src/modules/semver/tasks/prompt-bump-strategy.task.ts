import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-bump-strategy";
    readonly description = "Prompts the user to select a bump strategy (manual or automatic) if none is specified.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const hasBumpStrategy = Boolean(config.bumpStrategy);
        const hasReleaseType = Boolean(config.releaseType);

        return ok(!(hasBumpStrategy || hasReleaseType));
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok(["execute-bump-strategy"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
