import { createTokenAuth } from "@octokit/auth-token";
import { Octokit } from "@octokit/core";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { getRepositoryUrl } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";

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
