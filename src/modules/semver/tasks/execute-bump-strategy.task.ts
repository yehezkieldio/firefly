import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class ExecuteBumpStrategyTask implements Task<ReleaseTaskContext> {
    readonly id = "execute-bump-strategy";
    readonly name = "Execute Bump Strategy";
    readonly description = "Executes the selected bump strategy to determine the new version.";

    getDependencies(): string[] {
        return ["prompt-bump-strategy"];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
