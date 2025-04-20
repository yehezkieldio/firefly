import { err, ok, type Result, type ResultAsync } from "neverthrow";
import { fs } from "#/lib/fs";
import { createErrorFromUnknown } from "#/lib/utils";

export interface PackageJson {
    name: string;
    version: string;
    description: string;
    homepage: string;
}

function readPackageJson(filePath: string): ResultAsync<PackageJson, Error> {
    return fs
        .getTextFromFile(filePath)
        .map((content: string): PackageJson => JSON.parse(content))
        .mapErr(
            (e: unknown): Error => createErrorFromUnknown(e, `Failed to read or parse package.json at ${filePath}`)
        );
}

function getPackageName(pkg: PackageJson): Result<string, Error> {
    return pkg.name ? ok(pkg.name) : err(new Error("Name field not found in package.json"));
}

function getPackageNameWithScope(pkg: PackageJson): Result<{ name: string; scope: string }, Error> {
    const name = pkg.name;
    if (!name) {
        return err(new Error("Name field not found in package.json"));
    }

    const scope: string | undefined = name?.startsWith("@") ? name?.split("/")[0]?.slice(1) : "";
    if (!scope) {
        return err(new Error("Scope not found in package.json"));
    }
    const packageName: string | undefined = name.startsWith("@") ? name.split("/")[1] : name;
    if (!packageName) {
        return err(new Error("Package name not found in package.json"));
    }

    return ok({ name: packageName, scope });
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
    readPackageJson,
    getPackageName,
    getPackageNameWithScope,
    getPackageVersion,
    updatePackageVersion
};
