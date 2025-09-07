import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class BumpVersionTask implements Task<ReleaseTaskContext> {
    readonly id = "bump-version";
    readonly description = "Writes the new version to package.json.";

    isEntryPoint(): boolean {
        return false;
    }

    getDependencies(): string[] {
        return [];
    }

    getDependents(): string[] {
        return [];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
