import { type Options as GitCliffOptions } from "git-cliff";
import { okAsync, type ResultAsync } from "neverthrow";
import { resolveTagName } from "#/lib/config";
import { getGitRootDirection, getToken } from "#/lib/git";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

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
                includePath: `${context.config.base}/*`,
                githubRepo: context.config.repository
            });
        }

        return okAsync({
            ...options,
            githubRepo: context.config.repository
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
            prepend: context.config.changelogPath
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
