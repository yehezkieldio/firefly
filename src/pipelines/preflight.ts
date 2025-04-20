import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { CWD_GIT_CLIFF_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { executeGit } from "#/lib/git";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function preflightPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context).andThen(checkUncommittedChanges).andThen(checkGitCliffConfig).andThen(checkGitRepository);
}

function checkGitCliffConfig(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return fs
        .fileExists(CWD_GIT_CLIFF_PATH)
        .andTee((): void => logger.verbose("Preflight: Checking for cliff.toml in the current working directory."))
        .andThen((exists: boolean): ResultAsync<ArtemisContext, Error> => {
            return exists
                ? okAsync(context).andTee((): void =>
                      logger.verbose("Preflight: Found cliff.toml in the current working directory.")
                  )
                : errAsync(new Error("Preflight: Could not find cliff.toml in the current working directory."));
        });
}

function checkGitRepository(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return executeGit(["rev-parse", "--is-inside-work-tree"]).andThen(
        (result: string): ResultAsync<ArtemisContext, Error> => {
            return result.trim() === "true"
                ? okAsync(context).andTee((): void => {
                      logger.verbose("Preflight: Found a git repository in the current working directory.");
                  })
                : errAsync(new Error("Preflight: Could not find a git repository in the current working directory."));
        }
    );
}

function checkUncommittedChanges(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.dryRun) {
        logger.verbose("Preflight: Skipping uncommitted changes check as dry run is enabled.");
        return okAsync(context);
    }

    return executeGit(["status", "--porcelain"])
        .andTee((): void =>
            logger.verbose("Preflight: Checking for uncommitted changes in the current working directory.")
        )
        .andThen((result: string): ResultAsync<ArtemisContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.trim() === ""
                  ? okAsync(context)
                  : errAsync(new Error("Preflight: There are uncommitted changes in the current working directory."));
        });
}
