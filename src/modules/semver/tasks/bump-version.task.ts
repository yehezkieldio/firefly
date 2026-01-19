import { colors } from "consola/utils";
import { ResultAsync, errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CargoTomlService } from "#/modules/filesystem/cargo-toml.service";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { PackageJsonService } from "#/modules/filesystem/package-json.service";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class BumpVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "bump-version";
    readonly description = "Writes the new version to package.json and/or Cargo.toml.";
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

        logger.info("Updating version...");

        return this.updateVersionFiles(basePath, nextVersion, dryRun).andTee(() => [
            logger.success(`Version updated to ${colors.cyanBright(nextVersion)}`),
        ]);
    }

    private updateVersionFiles(basePath: string, version: string, dryRun?: boolean): FireflyAsyncResult<void> {
        const packageJsonPath = `${basePath}/package.json`;
        const cargoTomlPath = `${basePath}/Cargo.toml`;

        return FileSystemService.exists(packageJsonPath).andThen((packageJsonExists) =>
            FileSystemService.exists(cargoTomlPath).andThen((cargoTomlExists) => {
                if (!(packageJsonExists || cargoTomlExists)) {
                    return errAsync(
                        createFireflyError({
                            code: "NOT_FOUND",
                            message: "No package.json or Cargo.toml found in the base path.",
                        }),
                    );
                }

                const updates: Promise<FireflyResult<void>>[] = [];

                if (packageJsonExists) {
                    const packageJsonService = PackageJsonService.getInstance(basePath);
                    updates.push(packageJsonService.updateVersion(version, dryRun));
                    logger.verbose("BumpVersionTask: Updating package.json");
                }

                if (cargoTomlExists) {
                    const cargoTomlService = CargoTomlService.getInstance(basePath);
                    updates.push(cargoTomlService.updateVersion(version, dryRun));
                    logger.verbose("BumpVersionTask: Updating Cargo.toml");
                }

                return ResultAsync.combine(updates.map((p) => ResultAsync.fromPromise(p, toFireflyError))).map(
                    () => {},
                );
            }),
        );
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

        return this.updateVersionFiles(basePath, this.previousVersion, dryRun);
    }
}
