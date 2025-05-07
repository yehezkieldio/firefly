import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { CWD_GIT_CLIFF_PATH } from "#/infrastructure/constants";
import { fs } from "#/infrastructure/fs";
import { executeGit } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";

export function preflightPipeline(): ResultAsync<void, Error> {
    if (process.env.ARTEMIS_DEBUG) {
        return okAsync(undefined).andTee((): void => logger.log("Preflight: Skipping preflight checks"));
    }
    return checkGitRepository().andThen(checkGitCliffConfig);
}

function checkGitCliffConfig(): ResultAsync<void, Error> {
    return fs
        .fileExists(CWD_GIT_CLIFF_PATH)
        .andTee((): void => logger.verbose("Preflight: Checking for cliff.toml in the current working directory."))
        .andThen((exists: boolean): ResultAsync<void, Error> => {
            return exists
                ? okAsync(undefined).andTee((): void =>
                      logger.verbose("Preflight: Found cliff.toml in the current working directory.")
                  )
                : errAsync(new Error("Preflight: Could not find cliff.toml in the current working directory."));
        });
}

function checkGitRepository(): ResultAsync<void, Error> {
    return executeGit(["rev-parse", "--is-inside-work-tree"]).andThen((result: string): ResultAsync<void, Error> => {
        return result.trim() === "true"
            ? okAsync(undefined).andTee((): void => {
                  logger.verbose("Preflight: Found a git repository in the current working directory.");
              })
            : errAsync(new Error("Preflight: Could not find a git repository in the current working directory."));
    });
}
