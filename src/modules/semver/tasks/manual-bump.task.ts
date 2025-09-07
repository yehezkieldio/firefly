import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { PromptManualVersionTask } from "#/modules/semver/tasks/prompt-manual-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ManualBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "manual-bump";
    readonly name = "Manual Version Bump";
    readonly description = "Handles manual version bumping based on user input.";

    getDependencies(): string[] {
        return [taskRef(PromptManualVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        const strategy = config.bumpStrategy;

        // Only execute if bump strategy is specifically "manual"
        return ok(strategy === "manual");
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok(["bump-version"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
