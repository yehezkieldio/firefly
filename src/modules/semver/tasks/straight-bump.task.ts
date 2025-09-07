import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class StraightBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "straight-bump";
    readonly name = "Straight Version Bump";
    readonly description = "Handles direct version bumping without any prompts or strategies.";

    getDependencies(): string[] {
        return ["initialize-current-version"];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const hasStraightBumpParams = context.getConfig().releaseType;

        // Only execute if releaseType is specified (indicating a straight bump)
        return ok(Boolean(hasStraightBumpParams));
    }

    getNextTasks(_context?: ReleaseTaskContext): FireflyResult<string[]> {
        return ok(["generate-changelog"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
