import { err, ok, type Result, type ResultAsync } from "neverthrow";
import { fs } from "#/lib/fs";

export interface PackageJson {
    name: string;
    version: string;
    description: string;
    homepage: string;
}

function getPackageName(pkg: PackageJson): Result<string, Error> {
    return pkg.name ? ok(pkg.name) : err(new Error("Name field not found in package.json"));
}

function getPackageVersion(pkg: PackageJson): Result<string, Error> {
    return pkg.version ? ok(pkg.version) : err(new Error("Version field not found in package.json"));
}

function updatePackageVersion(path: string, newVersion: string): ResultAsync<void, Error> {
    const VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    function matchAndUpdate(content: string): Result<string, Error> {
        if (!VERSION_REGEX.test(content)) {
            return err(new Error(`Version field not found in package.json at ${path}`));
        }

        const updatedContent: string = content.replace(VERSION_REGEX, `$1"${newVersion}"$2`);
        return ok(updatedContent);
    }

    return fs
        .getTextFromFile(path)
        .andThen(matchAndUpdate)
        .andThen((updatedContent: string): ResultAsync<number, Error> => fs.writeContentToFile(path, updatedContent))
        .map((): void => undefined);
}

export const pkgJson = {
    getPackageName,
    getPackageVersion,
    updatePackageVersion
};
