import { colors } from "consola/utils";
import { errAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { CWD_PACKAGE_PATH } from "#/infrastructure/constants";
import { fs, pkgJson } from "#/infrastructure/fs";
import { logger } from "#/infrastructure/logging";

export function bumpVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return writePackageJson(context, context.nextVersion)
        .map((): ArtemisContext => context)
        .mapErr((error: Error): Error => {
            logger.error("Error bumping version:", error);
            return error;
        });
}

function writePackageJson(context: ArtemisContext, version: string): ResultAsync<ArtemisContext, Error> {
    return fs.fileExists(CWD_PACKAGE_PATH).andThen((packageExists: boolean) => {
        if (packageExists) {
            return pkgJson
                .updatePackageVersion(CWD_PACKAGE_PATH, version)
                .andTee((): void => {
                    const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";
                    logger.info(`Bumped package.json version to ${colors.dim(context.nextVersion)}${dryRunIndicator}`);
                })
                .map((): ArtemisContext => context);
        }

        return errAsync(new Error("package.json not found. Please run this command in the root of your project."));
    });
}

export function rollbackBumpVersionPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    return writePackageJson(context, context.currentVersion)
        .map((): void => {
            const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";
            logger.info(`Rolled back package.json version to ${colors.dim(context.currentVersion)}${dryRunIndicator}`);
        })
        .mapErr((error: Error): Error => {
            logger.error("Error rolling back version:", error);
            return error;
        });
}
