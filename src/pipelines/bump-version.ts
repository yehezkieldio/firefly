import { colors } from "consola/utils";
import { errAsync, ResultAsync } from "neverthrow";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { logger } from "#/lib/logger";
import { pkgJson } from "#/lib/package-json";
import type { ArtemisContext } from "#/types";

export function bumpVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return writePackageJson(context)
        .map((): ArtemisContext => context)
        .mapErr((error: Error): Error => {
            logger.error("Error bumping version:", error);
            return error;
        });
}

function writePackageJson(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return fs.fileExists(CWD_PACKAGE_PATH).andThen((packageExists: boolean) => {
        if (packageExists) {
            return pkgJson
                .updatePackageVersion(CWD_PACKAGE_PATH, context.nextVersion)
                .andTee((): void => logger.info(`Bumped package.json version to ${colors.dim(context.nextVersion)}`))
                .map((): ArtemisContext => context);
        }

        return errAsync(new Error("package.json not found. Please run this command in the root of your project."));
    });
}
