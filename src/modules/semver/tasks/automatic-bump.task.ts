import { okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class AutomaticBumpTask implements Task<ReleaseTaskContext> {
    readonly id = "automatic-bump";
    readonly name = "Automatic Version Bump";
    readonly description = "Uses semantic analysis/recommendation to decide and set the next version automatically.";

    getDependencies(): string[] {
        return ["execute-bump-strategy"];
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
