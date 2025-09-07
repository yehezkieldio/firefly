import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptManualVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-manual-version";
    readonly name = "Prompt for Manual Version";
    readonly description = "Prompts the user to input the desired version when manual bump strategy is selected.";

    getDependencies(): string[] {
        return ["execute-bump-strategy"];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const strategy = config.bumpStrategy;

        // Only execute if bump strategy is specifically "manual"
        return ok(strategy === "manual");
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
