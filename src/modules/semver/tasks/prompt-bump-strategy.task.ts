import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-bump-strategy";
    readonly name = "Prompt for Bump Strategy";
    readonly description = "Prompts the user to select a bump strategy (manual or automatic) if none is specified.";

    getDependencies(): string[] {
        return ["initialize-current-version"];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const hasReleaseType = Boolean(config.releaseType);
        const hasBumpStrategy = Boolean(config.bumpStrategy);

        const shouldExecute = !(hasReleaseType || hasBumpStrategy);
        return ok(shouldExecute);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok(["execute-bump-strategy"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
