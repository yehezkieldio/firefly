import { colors } from "consola/utils";
import { ResultAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { CargoTomlService } from "#/modules/filesystem/cargo-toml.service";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { PackageJsonService } from "#/modules/filesystem/package-json.service";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class InitializeCurrentVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version from package.json, Cargo.toml, or initializes it to 0.0.0.";

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getSkipThroughTasks(): FireflyResult<string[]> {
        return ok([taskRef(VersionFlowControllerTask)]);
    }

    canUndo(): boolean {
        return false;
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        logger.verbose("InitializeCurrentVersionTask: Initializing current version...");

        const basePath = context.getBasePath();
        const packageJsonPath = `${basePath}/package.json`;
        const cargoTomlPath = `${basePath}/Cargo.toml`;

        return FileSystemService.exists(packageJsonPath).andThen((packageJsonExists) => {
            if (packageJsonExists) {
                const packageJsonService = PackageJsonService.getInstance(basePath);
                return ResultAsync.fromPromise(packageJsonService.read(), toFireflyError).andThen((pkg) => {
                    let version = "0.0.0";
                    if (pkg.isOk() && pkg.value.version) {
                        version = pkg.value.version;
                    }
                    return this.setVersion(context, version);
                });
            }

            return FileSystemService.exists(cargoTomlPath).andThen((cargoTomlExists) => {
                if (cargoTomlExists) {
                    const cargoTomlService = CargoTomlService.getInstance(basePath);
                    return ResultAsync.fromPromise(cargoTomlService.read(), toFireflyError).andThen((cargo) => {
                        let version = "0.0.0";
                        if (cargo.isOk() && cargo.value.package.version) {
                            version = cargo.value.package.version;
                        }
                        return this.setVersion(context, version);
                    });
                }

                return this.setVersion(context, "0.0.0");
            });
        });
    }

    private setVersion(context: ReleaseTaskContext, version: string): FireflyAsyncResult<void> {
        logger.verbose(`InitializeCurrentVersionTask: Current version is "${version}"`);
        logger.info(`Current version is ${colors.cyanBright(version)}`);

        context.set("currentVersion", version);

        return okAsync();
    }
}
