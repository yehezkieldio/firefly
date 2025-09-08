import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CreateTagTask } from "#/modules/git/tasks/create-tag.task";
import { StageChangesTask } from "#/modules/git/tasks/stage-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class CommitChangesTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "commit-changes";
    readonly description = "Commits the changes for the release.";

    getDependencies(): string[] {
        return [taskRef(StageChangesTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipGit);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGit) {
            return ok([]);
        }

        return ok([taskRef(CreateTagTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
