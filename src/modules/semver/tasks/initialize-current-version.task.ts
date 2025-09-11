import { ResultAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PackageJsonService } from "#/modules/filesystem/package-json.service";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class InitializeCurrentVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version from package.json or initializes it to 0.0.0.";

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }
        return ok([taskRef(VersionFlowControllerTask)]);
    }

    canUndo(): boolean {
        return false;
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        logger.verbose("InitializeCurrentVersionTask: Initializing current version...");

        const basePath = context.getBasePath();
        const packageJsonService = PackageJsonService.getInstance(basePath);

        return ResultAsync.fromPromise(packageJsonService.read(), toFireflyError).andThen((pkg) => {
            const version = pkg.isErr() || !pkg.value.version ? "0.0.0" : pkg.value.version;
            logger.verbose(`InitializeCurrentVersionTask: Current version is "${version}"`);
            logger.info(`Current version is ${version}`);

            context.set("currentVersion", version);

            return okAsync();
        });
    }
}
