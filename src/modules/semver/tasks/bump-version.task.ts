import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { PackageJsonService } from "#/modules/filesystem/package-json.service";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class BumpVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "bump-version";
    readonly description = "Writes the new version to package.json.";
    private previousVersion?: string = "";

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
        return ok(!config.skipBump);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(ChangelogFlowControllerTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        this.previousVersion = context.getCurrentVersion();

        const basePath = context.getBasePath();
        const nextVersion = context.getNextVersion();
        const dryRun = context.getConfig().dryRun;

        const packageJsonService = PackageJsonService.getInstance(basePath);
        const updateVersionResult = packageJsonService.updateVersion(nextVersion, dryRun);

        logger.info(`Updating version to ${nextVersion}`);
        return ResultAsync.fromPromise(updateVersionResult, toFireflyError).andThen(() => okAsync());
    }

    canUndo(): boolean {
        return true;
    }

    undo(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        if (!this.previousVersion) {
            return errAsync(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "Previous version not found, cannot undo version bump.",
                }),
            );
        }

        const basePath = context.getBasePath();
        const dryRun = context.getConfig().dryRun;

        const packageJsonService = PackageJsonService.getInstance(basePath);
        const updateVersionResult = packageJsonService.updateVersion(this.previousVersion, dryRun);

        return ResultAsync.fromPromise(updateVersionResult, toFireflyError).andThen(() => okAsync());
    }
}
