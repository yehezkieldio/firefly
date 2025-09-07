import { okAsync } from "neverthrow";
import type { ReleaseContextData } from "#/application/context";
import type { Task, TaskContext } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class ProposeVersionBumpTask implements Task<TaskContext<ReleaseContextData>> {
    readonly id = "propose-version-bump";
    readonly name = "Propose Version Bump";
    readonly description = "Prompt for user input to determine the strategy in which to bump the version.";

    execute(_context: TaskContext<ReleaseContextData>): FireflyAsyncResult<void> {
        return okAsync();
    }
}
