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
        const config = context.getConfig();

        // If releaseType is specified, we are doing a straight bump - skipping bump strategy and manual version prompts
        if (config.releaseType !== undefined) {
            return ok(true);
        }

        return ok(false);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok(["bump-version"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
