import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class BumpVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "bump-version";
    readonly description = "Writes the new version to package.json.";

    isEntryPoint(): boolean {
        return false;
    }

    getDependents(): string[] {
        return [];
    }

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipBump);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(ChangelogFlowControllerTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        logger.log("Current version is", context.getCurrentVersion());
        logger.log("Bumping version to", context.getNextVersion());

        return okAsync();
    }
}
