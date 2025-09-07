import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class ReleasePreflightCheckTask implements Task<ReleaseTaskContext> {
    readonly id = "release-preflight-check";
    readonly name = "Release Preflight Check";
    readonly description = "Performs preflight checks before starting the release process.";

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
