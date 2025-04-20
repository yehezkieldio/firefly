import { colors } from "consola/utils";
import { errAsync, ResultAsync } from "neverthrow";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { logger } from "#/lib/logger";
import { pkgJson } from "#/lib/package-json";
import type { ArtemisContext } from "#/types";

export function bumpVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return writePackageJson(context, context.nextVersion)
        .map((): ArtemisContext => context)
        .mapErr((error: Error): Error => {
            logger.error("Error bumping version:", error);
            return error;
        });
}

export function rollbackVersionPipeline(context: ArtemisContext): ResultAsync<void, Error> {
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
