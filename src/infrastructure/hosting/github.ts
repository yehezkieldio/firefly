import { createTokenAuth } from "@octokit/auth-token";
import { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/core/types";
import { colors } from "consola/utils";
import { err, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { removeHeaderFromChangelog } from "#/infrastructure/changelog/git-cliff";
import { resolveReleaseTitle, resolveTagName } from "#/infrastructure/config";
import { getRepositoryUrl, getToken, type Repository } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown, flattenMultilineText } from "#/infrastructure/utils";

interface ReleaseParams extends RequestParameters {
    owner: string;
    repo: string;
    tag_name: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    generate_release_notes: boolean;
    make_latest: "true" | "false";
    headers: typeof OctokitRequestHeaders;
}

function createReleaseParams(context: ArtemisContext, repository: Repository, content: string): ReleaseParams {
    const { releaseLatest, releaseDraft, releasePreRelease } = context.options;

    const [owner, repo]: string[] = repository.split("/");
    if (!owner || !repo) {
        throw new Error("Invalid repository format. Expected 'owner/repo'.");
    }

    return {
        owner: owner,
        repo: repo,
        tag_name: resolveTagName(context),
        name: resolveReleaseTitle(context),
        body: content,
        draft: releaseDraft,
        prerelease: releasePreRelease,
        generate_release_notes: content === "",
        make_latest: String(releaseLatest) as "true" | "false",
        headers: OctokitRequestHeaders
    };
}

export function createOctoKitGitHubRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createOctokit)
            .andThen((octokit: Octokit): ResultAsync<void, Error> => {
                const params: ReleaseParams = createReleaseParams(context, repository, content);
                const logParams = { ...params };
                logParams.body = content.length > 100 ? `${content.slice(0, 100)}...` : content;

                logger.verbose(
                    `Creating GitHub release with params: ${colors.dim(flattenMultilineText(JSON.stringify(logParams)))}`
                );

                if (context.options.dryRun) {
                    return okAsync(undefined);
                }

                return ResultAsync.fromPromise(
                    octokit.request("POST /repos/{owner}/{repo}/releases", params),
                    (error: unknown): Error => createErrorFromUnknown(error, "Failed to create GitHub release")
                ).map((): void => undefined);
            })
            .andTee((): void => {
                logger.info(`GitHub ${colors.dim("release")} created successfully${dryRunIndicator}`);
            });
    }

    return removeHeaderFromChangelog(context.changelogContent).andThen(
        (content: string): ResultAsync<ArtemisContext, Error> => {
            const repository = context.options.repository! as Repository;
            if (!repository) {
                throw new Error("Repository is not defined in the configuration.");
            }

            return publishRelease(repository, content).map((): ArtemisContext => context);
        }
    );
}

export const OctokitRequestHeaders = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json"
};

const ARTEMIS_USER_AGENT = "Artemis (https://github.com/yehezkieldio/artemis)";

export function createOctokit(token: string): ResultAsync<Octokit, Error> {
    function createOctokitInstance(token: string): Octokit {
        const octokitWithDefaults: typeof Octokit = Octokit.defaults({
            userAgent: ARTEMIS_USER_AGENT
        });

        return new octokitWithDefaults({ auth: token });
    }

    function authenticateWithGithub(token: string): ResultAsync<{ token: string }, Error> {
        return ResultAsync.fromPromise(createTokenAuth(token)(), (e: unknown): Error => createErrorFromUnknown(e));
    }

    return authenticateWithGithub(token)
        .map((auth: { token: string }): Octokit => {
            return createOctokitInstance(auth.token);
        })
        .mapErr((error: Error): Error => {
            logger.verbose(error.message);
            return error;
        });
}

export function executeGitHubCLI(args: string[]): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Response(
            Bun.spawn(["gh", ...args], {
                stdout: "pipe",
                stderr: "pipe"
            }).stdout
        ).text(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to execute GitHub CLI command")
    );
}

export function getGitHubCliToken(): ResultAsync<string, Error> {
    logger.verbose("Retrieving GitHub token from GitHub CLI");

    return executeGitHubCLI(["auth", "status"]).andThen((result: string): ResultAsync<string, Error> => {
        const hasRepoScope: boolean = result.includes("'repo'") || result.includes('"repo"');
        if (!hasRepoScope) logger.verbose("GitHub token does not have 'repo' scope");

        return executeGitHubCLI(["auth", "token"]).map((tokenResult: string) => {
            const token: string = tokenResult.trim();
            logger.verbose("Successfully retrieved GitHub token");
            return token;
        });
    });
}

export function isGitHubAuthenticated(): ResultAsync<boolean, Error> {
    logger.verbose("Checking GitHub CLI authentication status");

    return ResultAsync.fromPromise(
        executeGitHubCLI(["auth", "status"]),
        (error: unknown): Error => createErrorFromUnknown(error, "Failed to check GitHub authentication status")
    )
        .map((): boolean => true)
        .orElse((error: Error): Result<boolean, Error> => {
            if (error.message.includes("not logged into")) {
                return ok(false);
            }
            return err(error);
        });
}

export function getRepositoryUsingGitHubCLI(): ResultAsync<string, Error> {
    return executeGitHubCLI(["repo", "view", "--json", "url"])
        .map((result: string): string => {
            const json: { url: string } = JSON.parse(result);
            return json.url;
        })
        .orElse((): ResultAsync<string, Error> => {
            logger.verbose("Failed to get repository using GitHub CLI, falling back to git");
            return getRepositoryUrl();
        });
}
