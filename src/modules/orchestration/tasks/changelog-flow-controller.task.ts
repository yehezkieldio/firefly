import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpVersionTask } from "#/modules/semver/tasks";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ChangelogFlowControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "changelog-flow-controller";
    readonly description = "Controls the flow for changelog generation based on configuration.";

    getDependencies(): string[] {
        return [taskRef(BumpVersionTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipChangelog) {
            return ok(["test"]);
        }

        return ok(["test"]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
