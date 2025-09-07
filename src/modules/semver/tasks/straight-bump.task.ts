import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class StraightBumpTask implements Task<ReleaseTaskContext> {
    readonly id = "straight-bump";
    readonly name = "Straight Version Bump";
    readonly description = "Handles direct version bumping without any prompts or strategies.";

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
