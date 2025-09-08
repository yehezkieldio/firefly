import { ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PlatformPublishControllerTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "platform-publish-controller";
    readonly description = "Controls the flow for platform publish based on configuration.";

    getDependencies(): string[] {
        return [""];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGitHubRelease) {
            return ok([]);
        }

        return ok([""]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        return okAsync();
    }
}
