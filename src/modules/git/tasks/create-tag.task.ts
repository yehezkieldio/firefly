import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class CreateTagTask implements Task<ReleaseTaskContext> {
    readonly id = "create-tag";
    readonly description = "Creates a new tag for the release.";

    getDependencies(): string[] {
        return [taskRef(CommitChangesTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
