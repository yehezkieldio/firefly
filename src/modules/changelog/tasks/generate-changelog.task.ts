import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks/write-changelog-file.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpVersionTask } from "#/modules/semver/tasks";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class GenerateChangelogTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "generate-changelog";
    readonly description = "Generates the changelog based on the current release context.";

    getDependencies(): string[] {
        return [taskRef(BumpVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipChangelog);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(WriteChangelogFileTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
