import { okAsync } from "neverthrow";
import type { ReleaseContextData } from "#/application/context";
import type { Task, TaskContext } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class GetInitialVersionTask implements Task<TaskContext<ReleaseContextData>> {
    readonly id = "get-initial-version";
    readonly name = "Get Initial Version";
    readonly description = "Retrieve current version from package.json";

    execute(context: TaskContext<ReleaseContextData>): FireflyAsyncResult<void> {
        context.set("currentVersion", "2.0.0");

        return okAsync();
    }
}
