import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class StageChangesTask implements Task<ReleaseTaskContext> {
    readonly id = "stage-changes";
    readonly description = "Stages the changes for the release.";

    getDependencies(): string[] {
        return [taskRef(WriteChangelogFileTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
