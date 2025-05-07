import { colors } from "consola/utils";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { resolveTagName } from "#/infrastructure/config";
import { executeGit } from "#/infrastructure/git";
import { createOctoKitGitHubRelease } from "#/infrastructure/hosting/github";
import { createGitLabRelease } from "#/infrastructure/hosting/gitlab";
import { logger } from "#/infrastructure/logging";

export function createHostReleasePipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (!context.options.skipGitHubRelease && !context.options.skipGitLabRelease) {
        return errAsync(new Error("Both GitHub and GitLab releases cannot be enabled at the same time"));
    }

    if (!context.options.skipGitHubRelease) {
        return createOctoKitGitHubRelease(context);
    }

    if (!context.options.skipGitLabRelease) {
        return createGitLabRelease(context);
    }

    logger.info("Skipping host release as both GitHub and GitLab releases are disabled");
    return okAsync(context);
}

export function rollbackCreateHostReleasePipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        const platform = !context.options.skipGitHubRelease ? "GitHub" : "GitLab";
        logger.info(`Would delete ${platform} release ${colors.yellow("(dry run)")}`);
        return okAsync(undefined);
    }

    const tagName: string = resolveTagName(context);
    const repository: string | undefined = context.options.repository;
    if (!repository) {
        return okAsync(undefined);
    }

    const [owner, repo] = repository.split("/");

    if (!context.options.skipGitHubRelease) {
        logger.info(`Deleting GitHub release for tag ${colors.dim(tagName)}`);
        return executeGit(["gh", "release", "delete", tagName, "--yes", "--repo", `${owner}/${repo}`])
            .andTee((): void => {
                logger.info(`Successfully deleted GitHub release for tag ${colors.dim(tagName)}`);
            })
            .map((): void => undefined);
    }

    logger.info(`Deleting GitLab release for tag ${colors.dim(tagName)}`);
    return executeGit(["glab", "release", "delete", tagName, "--yes", "--repo", `${owner}/${repo}`])
        .andTee((): void => {
            logger.info(`Successfully deleted GitLab release for tag ${colors.dim(tagName)}`);
        })
        .map((): void => undefined);
}
