import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

const PACKAGE_JSON_FILE = "package.json";

/**
 * Reads package.json and extracts the version field.
 *
 * Behavior:
 * - Reads the configured package file using packageJson service.
 * - If the `version` property is missing, returns a validation error.
 * - Otherwise resolves with the version string.
 */
function getVersionFromPackageJson(ctx: ReleaseContext): FireflyAsyncResult<string> {
    return ctx.services.packageJson.read(PACKAGE_JSON_FILE).andThen((pkg) => {
        const version = pkg.version;

        if (!version) {
            return validationErrAsync({
                message: "The 'version' field is missing in package.json.",
            });
        }

        logger.verbose(`InitializeReleaseVersionTask: Prepared current version: ${version}`);
        return FireflyOkAsync(version);
    });
}

/**
 * Creates the Initialize Release Version task.
 *
 * This task initializes the current release version by reading it from package.json.
 *
 * This task:
 * 1. Reads the version from package.json
 */
export function createInitializeReleaseVersion(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("initialize-release-version")
        .description("Initialize current release version from package.json")
        .dependsOn("prepare-release-config")
        .execute((ctx) =>
            getVersionFromPackageJson(ctx).andThen((currentVersion) => {
                logger.info(`InitializeReleaseVersionTask: Current version is ${currentVersion}`);
                const updatedCtx = ctx.fork("currentVersion", currentVersion);

                return FireflyOkAsync(updatedCtx);
            })
        )
        .build();
}
