import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class BumpVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "bump-version";
    readonly description = "Writes the new version to package.json.";

    isEntryPoint(): boolean {
        return false;
    }

    getDependents(): string[] {
        return [];
    }

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        if (config.skipBump) {
            return ok(false);
        }

        return ok(true);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
