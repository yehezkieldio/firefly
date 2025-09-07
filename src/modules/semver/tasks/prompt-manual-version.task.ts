import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class PromptManualVersionTask implements Task<ReleaseTaskContext> {
    readonly id = "prompt-manual-version";
    readonly name = "Prompt for Manual Version";
    readonly description = "Prompts the user to input the desired version when manual bump strategy is selected.";

    getDependencies(): string[] {
        return ["execute-bump-strategy"];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
