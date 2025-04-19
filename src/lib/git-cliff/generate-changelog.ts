import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { ResultAsync } from "neverthrow";
import { updateChangelogInContext } from "#/context";
import { fs } from "#/lib/fs";
import { createGitCliffOptions } from "#/lib/git-cliff/cliff-options";
import { logger } from "#/lib/logger";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisContext } from "#/types";

export function generateChangelog(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return handleFileCreation(context)
        .andThen((): ResultAsync<GitCliffOptions, Error> => createGitCliffOptions(context))
        .andThen((options: GitCliffOptions): ResultAsync<string, Error> => executeGitCliff(options))
        .andThen((content: string): ResultAsync<ArtemisContext, Error> => {
            return updateChangelogInContext(context, content).andTee((): void =>
                logger.info("Changelog generated and updated")
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
    return fs.createIfNotExists(context.config.changelogPath || "CHANGELOG.md").mapErr((error: Error): Error => {
        logger.error("Error creating changelog file:", error);
        return error;
    });
}
