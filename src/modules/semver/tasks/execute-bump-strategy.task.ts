import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ExecuteBumpStrategyTask implements Task<ReleaseTaskContext> {
    readonly id = "execute-bump-strategy";
    readonly name = "Execute Bump Strategy";
    readonly description = "Executes the selected bump strategy to determine the new version.";

    getDependencies(): string[] {
        return ["prompt-bump-strategy"];
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const strategy = context.getConfig().bumpStrategy;

        if (strategy === "manual") {
            return ok(["prompt-manual-version"]);
        }

        if (strategy === "auto") {
            return ok(["automatic-bump"]);
        }

        return ok(["execute-bump-strategy"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
