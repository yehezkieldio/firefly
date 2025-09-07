import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class PromptBumpStrategyTask implements Task<ReleaseTaskContext> {
    readonly id = "prompt-bump-strategy";
    readonly name = "Prompt for Bump Strategy";
    readonly description = "Prompts the user to select a bump strategy (manual or automatic) if none is specified.";

    getDependencies(): string[] {
        return ["initialize-current-version"];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
