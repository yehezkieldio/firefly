import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { StageChangesTask } from "#/modules/git/tasks/stage-changes.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class CommitChangesTask implements Task<ReleaseTaskContext> {
    readonly id = "commit-changes";
    readonly description = "Commits the changes for the release.";

    getDependencies(): string[] {
        return [taskRef(StageChangesTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
