import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { parse, type TomlPrimitive } from "smol-toml";
import { CWD_GIT_CLIFF_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { createErrorFromUnknown } from "#/lib/utils";

interface ChangelogConfig {
    header: string;
    body: string;
    trim: boolean;
    footer: string;
}

interface CommitParser {
    message: string;
    body: string;
    group: string;
    skip: boolean;
}

interface CommitPreprocessor {
    pattern: string;
    replace: string;
}

interface GitConfig {
    conventionalCommits: boolean;
    filterUnconventional: boolean;
    commitParsers: CommitParser[];
    commitPreprocessors: CommitPreprocessor[];
    filterCommits: boolean;
    tagPattern: string;
    ignoreTags: string;
    topoOrder: boolean;
    sortCommits: string;
}

interface CliffToml {
    changelog: Partial<ChangelogConfig>;
    git: Partial<GitConfig>;
}

type Constructor<T> = new (...args: unknown[]) => T;

function isObject<T extends Constructor<unknown> = ObjectConstructor>(
    input: unknown,
    constructorType?: T
): input is object {
    return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
}

function isCliffToml(value: TomlPrimitive | unknown): value is CliffToml {
    return isObject(value);
}

function parseCliffConfig(): ResultAsync<CliffToml, Error> {
    return fs
        .getTextFromFile(CWD_GIT_CLIFF_PATH)
        .map(parse)
        .mapErr((error: unknown): Error => createErrorFromUnknown(error, "Failed to parse Git Cliff configuration"))
        .andThen(
            (config: TomlPrimitive): ResultAsync<CliffToml, Error> =>
                isCliffToml(config) ? okAsync(config) : errAsync(new Error("Invalid Git Cliff configuration format"))
        );
}

export function removeHeaderFromChangelog(content: string): ResultAsync<string, Error> {
    return parseCliffConfig().andThen((config: CliffToml): ResultAsync<string, Error> => {
        const header: string | undefined = config.changelog?.header;
        if (!header) {
            return okAsync(content);
        }

        const headerIndex: number = content.indexOf(header);
        return headerIndex !== -1 ? okAsync(content.slice(headerIndex + header.length)) : okAsync(content);
    });
}
