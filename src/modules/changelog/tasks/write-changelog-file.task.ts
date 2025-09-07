import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class WriteChangelogFileTask implements Task<ReleaseTaskContext> {
    readonly id = "write-changelog-file";
    readonly name = "Write Changelog File";
    readonly description = "Writes the changelog file based on the current release context.";

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
