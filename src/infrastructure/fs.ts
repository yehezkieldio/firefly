import { err, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { useGlobalContext } from "#/application/context";
import { createErrorFromUnknown } from "#/infrastructure/utils";

function fileExists(path: string): ResultAsync<boolean, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).exists(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to check if file exists")
    );
}

function createIfNotExists(path: string): ResultAsync<boolean, Error> {
    const context = useGlobalContext();
    if (context.options.dryRun) {
        return okAsync(true);
    }

    return fileExists(path).andThen((exists: boolean): ResultAsync<boolean, Error> => {
        if (exists) return okAsync(true);

        return ResultAsync.fromPromise(
            Bun.write(path, ""),
            (error: unknown): Error => createErrorFromUnknown(error, "Unable to create file")
        ).map((): boolean => true);
    });
}

function getTextFromFile(path: string): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).text(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to read file")
    );
}

function getJsonFromFile<T>(path: string): ResultAsync<T, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).json(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to read file")
    );
}

function writeContentToFile(path: string, updatedContent: string): ResultAsync<number, Error> {
    const context = useGlobalContext();
    if (context.options.dryRun) {
        return ResultAsync.fromPromise(
            Promise.resolve(updatedContent.length),
            (error: unknown): Error => createErrorFromUnknown(error, "Unable to write file")
        );
    }

    return ResultAsync.fromPromise(
        Bun.write(path, updatedContent),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to write file")
    );
}

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

export const fs: {
    fileExists: typeof fileExists;
    createIfNotExists: typeof createIfNotExists;
    getTextFromFile: typeof getTextFromFile;
    getJsonFromFile: typeof getJsonFromFile;
    writeContentToFile: typeof writeContentToFile;
} = {
    fileExists,
    createIfNotExists,
    getTextFromFile,
    getJsonFromFile,
    writeContentToFile
};

export const pkgJson: {
    readPackageJson: typeof readPackageJson;
    getPackageName: typeof getPackageName;
    getPackageNameWithScope: typeof getPackageNameWithScope;
    getPackageVersion: typeof getPackageVersion;
    updatePackageVersion: typeof updatePackageVersion;
} = {
    readPackageJson,
    getPackageName,
    getPackageNameWithScope,
    getPackageVersion,
    updatePackageVersion
};
