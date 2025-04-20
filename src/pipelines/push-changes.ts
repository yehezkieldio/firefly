import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import { resolveTagName } from "#/lib/config";
import { executeGit } from "#/lib/git";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function pushChangesPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return pushChanges(context).andThen(pushTags);
}

export function rollbackPushChangesPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would rollback pushed commits and tags ${colors.yellow("(dry run)")}`);
        return okAsync(undefined);
    }

    return rollbackPushedTags(context)
        .andThen(() => rollbackPushedCommit(context))
        .map((): void => undefined);
}

function pushChanges(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.dryRun) {
        logger.info(`Pushed ${colors.dim("commits")} to remote ${colors.yellow("(dry run)")}`);
        return okAsync(context);
    }

    return executeGit(["push"])
        .andTee((): void => {
            logger.info(`Pushed commits to remote`);
        })
        .map((): ArtemisContext => {
            return context;
        });
}

function pushTags(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.dryRun) {
        logger.info(`Pushed ${colors.dim("tags")} to remote ${colors.yellow("(dry run)")}`);
        return okAsync(context);
    }

    return executeGit(["push", "--tags"])
        .andTee((): void => {
            logger.info(`Pushed tags to remote`);
        })
        .map((): ArtemisContext => {
            return context;
        });
}

function rollbackPushedTags(context: ArtemisContext): ResultAsync<void, Error> {
    const tagName: string = resolveTagName(context);

    logger.info(`Rolling back pushed tag ${colors.dim(tagName)}`);

    return executeGit(["push", "origin", "--delete", tagName])
        .andTee((): void => {
            logger.info(`Removed tag ${colors.dim(tagName)} from remote`);
        })
        .map((): void => undefined);
}

function rollbackPushedCommit(context: ArtemisContext): ResultAsync<void, Error> {
    logger.info(`Rolling back pushed commit`);

    return executeGit(["rev-parse", "HEAD~1"])
        .andThen((previousCommit: string): ResultAsync<string, Error> => {
            const trimmedCommit: string = previousCommit.trim();
            logger.verbose(`Rolling back to previous commit: ${colors.dim(trimmedCommit)}`);
            return executeGit(["rev-parse", "--abbrev-ref", "HEAD"]).andThen(
                (currentBranch: string): ResultAsync<string, Error> => {
                    const branch = context.config.branch || "main" || currentBranch.trim();
                    return executeGit(["push", "--force", "origin", `${trimmedCommit}:${branch}`]);
                }
            );
        })
        .andTee((): void => {
            logger.info(`Force pushed to previous commit state`);
        })
        .map((): void => undefined);
}
