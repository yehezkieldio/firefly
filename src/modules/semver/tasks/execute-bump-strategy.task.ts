import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { AutomaticBumpTask } from "#/modules/semver/tasks/automatic-bump.task";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { PromptManualVersionTask } from "#/modules/semver/tasks/prompt-manual-version.task";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ExecuteBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "execute-bump-strategy";
    readonly description = "Executes the selected bump strategy to determine the new version.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        return ok(!config.releaseType && Boolean(config.bumpStrategy));
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const strategy = context.getConfig().bumpStrategy;

        if (strategy === "manual") {
            return ok([taskRef(PromptManualVersionTask)]);
        }
        if (strategy === "auto") {
            return ok([taskRef(AutomaticBumpTask)]);
        }

        return ok([]);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }

        const strategy = config.bumpStrategy;

        if (strategy === "manual") {
            return ok([taskRef(PromptManualVersionTask)]);
        }
        if (strategy === "auto") {
            return ok([taskRef(AutomaticBumpTask)]);
        }

        return ok([taskRef(BumpVersionTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
