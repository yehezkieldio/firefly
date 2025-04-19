import { okAsync, ResultAsync } from "neverthrow";
import { useGlobalContext } from "#/context";
import { createErrorFromUnknown } from "#/lib/utils";

function fileExists(path: string): ResultAsync<boolean, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).exists(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to check if file exists")
    );
}

function createIfNotExists(path: string): ResultAsync<boolean, Error> {
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

export const fs = {
    fileExists,
    createIfNotExists,
    getTextFromFile,
    getJsonFromFile,
    writeContentToFile
};
