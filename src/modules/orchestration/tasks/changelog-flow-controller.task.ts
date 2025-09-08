import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks/generate-changelog.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks/git-flow-controller.task";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpVersionTask } from "#/modules/semver/tasks";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class ChangelogFlowControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "changelog-flow-controller";
    readonly description = "Controls the flow for changelog generation based on configuration.";

    getDependencies(context?: ReleaseTaskContext): string[] {
        const config = context?.getConfig();

        // If bump is skipped, we don't depend on BumpVersionTask
        if (config?.skipBump) {
            return [];
        }

        return [taskRef(BumpVersionTask)];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        // If changelog generation is skipped, go directly to git flow
        if (config.skipChangelog) {
            return ok([taskRef(GitFlowControllerTask)]);
        }

        return ok([taskRef(GenerateChangelogTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
