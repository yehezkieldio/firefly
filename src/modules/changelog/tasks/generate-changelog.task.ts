import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpVersionTask } from "#/modules/semver/tasks";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class GenerateChangelogTask implements Task<ReleaseTaskContext> {
    readonly id = "generate-changelog";
    readonly description = "Generates the changelog based on the current release context.";

    getDependencies(): string[] {
        return [taskRef(BumpVersionTask)];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
