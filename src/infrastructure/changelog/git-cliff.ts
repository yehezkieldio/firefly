import { colors } from "consola/utils";
import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { parse, type TomlPrimitive } from "smol-toml";
import { type ArtemisContext, updateChangelogInContext } from "#/application/context";
import { resolveTagName } from "#/infrastructure/config";
import { CWD_GIT_CLIFF_PATH } from "#/infrastructure/constants";
import { fs } from "#/infrastructure/fs";
import { getGitRootDirection, getToken } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";

export function generateChangelog(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";
    const initialStep = context.options.dryRun ? okAsync(true) : handleFileCreation(context);

    return initialStep
        .andTee((): void => logger.verbose("Generating changelog..."))
        .andThen((): ResultAsync<GitCliffOptions, Error> => createGitCliffOptions(context))
        .andThen((options: GitCliffOptions): ResultAsync<string, Error> => executeGitCliff(options))
        .andThen((content: string): ResultAsync<ArtemisContext, Error> => {
            return updateChangelogInContext(context, content).andTee((): void =>
                logger.info(`Changelog ${colors.dim("generated")} and ${colors.dim("updated")}${dryRunIndicator}`)
            );
        })
        .mapErr((error: unknown): Error => {
            logger.error("Failed to generate changelog:", error);
            return error instanceof Error ? error : new Error("Changelog generation failed");
        });
}

function executeGitCliff(options: GitCliffOptions): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        runGitCliff(options, { stdio: "pipe" }),
        (error: unknown): Error => createErrorFromUnknown(error, "Failed to generate changelog")
    ).map(({ stdout }): string => stdout);
}

function handleFileCreation(context: ArtemisContext): ResultAsync<boolean, Error> {
    return fs.createIfNotExists(context.options.changelogPath || "CHANGELOG.md").mapErr((error: Error): Error => {
        logger.error("Error creating changelog file:", error);
        return error;
    });
}

export function createGitCliffOptions(context: ArtemisContext): ResultAsync<GitCliffOptions, Error> {
    const initialOptions: GitCliffOptions = createInitialGitCliffOptions(context);

    return enhanceGitCliffOptions(initialOptions, context);
}

function enhanceGitCliffOptions(
    options: GitCliffOptions,
    context: ArtemisContext
): ResultAsync<GitCliffOptions, Error> {
    return getToken(context)
        .map((token: string): GitCliffOptions => ({ ...options, githubToken: token }))
        .andThen(
            (optionsWithToken: GitCliffOptions): ResultAsync<GitCliffOptions, Error> =>
                addGithubRepositoryToOptions(context, optionsWithToken)
        )
        .andThen(
            (optionsWithRepo: GitCliffOptions): ResultAsync<GitCliffOptions, Error> =>
                addPrependPathIfNeeded(context, optionsWithRepo)
        )
        .andThen(
            (optionsWithPrepend: GitCliffOptions): ResultAsync<GitCliffOptions, Error> =>
                addReleaseNotes(context, optionsWithPrepend)
        );
}

function addGithubRepositoryToOptions(
    context: ArtemisContext,
    options: GitCliffOptions
): ResultAsync<GitCliffOptions, Error> {
    return getGitRootDirection().andThen((direction: string): ResultAsync<GitCliffOptions, Error> => {
        if (direction && direction !== ".") {
            return okAsync({
                ...options,
                repository: direction,
                includePath: `${context.options.base}/*`,
                githubRepo: context.options.repository
            });
        }

        return okAsync({
            ...options,
            githubRepo: context.options.repository
        });
    });
}

function addPrependPathIfNeeded(
    context: ArtemisContext,
    options: GitCliffOptions
): ResultAsync<GitCliffOptions, Error> {
    if (!context.options.dryRun) {
        return okAsync({
            ...options,
            prepend: context.options.changelogPath
        });
    }
    return okAsync(options);
}

function addReleaseNotes(context: ArtemisContext, options: GitCliffOptions): ResultAsync<GitCliffOptions, Error> {
    if (context.options.releaseNotes && context.options.releaseNotes !== "") {
        return okAsync({
            ...options,
            withTagMessage: context.options.releaseNotes.replace(/\\n/g, "\n")
        });
    }

    return okAsync(options);
}

function createInitialGitCliffOptions(context: ArtemisContext): GitCliffOptions {
    return {
        tag: resolveTagName(context),
        unreleased: true,
        config: "./cliff.toml",
        output: "-"
    };
}

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
        const bodyTemplate: string | undefined = config.changelog?.body;

        if (!header || !bodyTemplate) {
            return okAsync(content);
        }

        const changesStartIndex: number = content.indexOf("###");
        if (changesStartIndex === -1) {
            return okAsync(content);
        }

        const processedContent: string = content.slice(changesStartIndex);

        return okAsync(processedContent.trimStart());
    });
}
