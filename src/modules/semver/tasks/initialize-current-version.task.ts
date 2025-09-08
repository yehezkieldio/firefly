import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class InitializeCurrentVersionTask implements Task<ReleaseTaskContext> {
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version from package.json or initializes it to 0.0.0.";

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
