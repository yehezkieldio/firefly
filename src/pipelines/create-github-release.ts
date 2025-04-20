import { colors } from "consola/utils";
import { okAsync, ResultAsync } from "neverthrow";
import { resolveTagName } from "#/lib/config";
import { executeGit } from "#/lib/git";
import { createGitHubRelease } from "#/lib/github-release";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function createGitHubReleasePipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.dryRun) {
        logger.info(`Created GitHub release ${colors.yellow("(dry run)")}`);
        return okAsync(context);
    }

    return createGitHubRelease(context);
}

export function rollbackGitHubReleasePipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would delete GitHub release ${colors.yellow("(dry run)")}`);
        return okAsync(undefined);
    }

    const tagName: string = resolveTagName(context);
    const repository: string | undefined = context.config.repository;
    if (!repository) {
        return okAsync(undefined);
    }

    const [owner, repo] = repository.split("/");
    logger.info(`Deleting GitHub release for tag ${colors.dim(tagName)}`);

    return executeGit(["gh", "release", "delete", tagName, "--yes", "--repo", `${owner}/${repo}`])
        .andTee((): void => {
            logger.info(`Successfully deleted GitHub release for tag ${colors.dim(tagName)}`);
        })
        .map((): void => undefined);
}
