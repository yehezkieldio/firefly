import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class ManualBumpTask implements Task<ReleaseTaskContext> {
    readonly id = "manual-bump";
    readonly name = "Manual Version Bump";
    readonly description = "Handles manual version bumping based on user input.";

    getDependencies(): string[] {
        return ["prompt-manual-version"];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
