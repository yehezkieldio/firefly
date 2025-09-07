import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GenerateChangelogTask } from "#/modules/changelog/tasks/generate-changelog.task";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class WriteChangelogFileTask implements Task<ReleaseTaskContext> {
    readonly id = "write-changelog-file";
    readonly description = "Writes the changelog file based on the current release context.";

    getDependencies(): string[] {
        return [taskRef(GenerateChangelogTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
