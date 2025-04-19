import type { ResultAsync } from "neverthrow";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { type PackageJson, pkgJson } from "#/lib/package-json";
import type { ArtemisContext } from "#/types";

export function enrichWithVersion(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    function getVersion(): ResultAsync<string, Error> {
        return fs.getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(pkgJson.getPackageVersion);
    }

    return getVersion().map(
        (version: string): ArtemisContext => ({
            ...context,
            currentVersion: version
        })
    );
}
