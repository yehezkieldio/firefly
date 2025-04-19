import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { logger } from "#/lib/logger";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisContext } from "#/types";

export type Repository = `${string}/${string}`;

export interface RepositoryObject {
    owner: string;
    repo: string;
}

export function executeGit(args: string[]): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Response(
            Bun.spawn(["git", ...args], {
                stdout: "pipe",
                stderr: "pipe"
            }).stdout
        ).text(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to execute git command")
    );
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

export function getToken(context: ArtemisContext): ResultAsync<string, Error> {
    const token: string = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.TOKEN || "";

    if (token.trim()) {
        logger.verbose("Using token from environment variables");
        return okAsync(token);
    }

    if (context) {
        logger.verbose("No token in environment variables, trying GitHub CLI");
        return getGitHubCliToken();
    }

    return errAsync(
        new Error("No authentication token provided. Please set GITHUB_TOKEN, GH_TOKEN, or TOKEN environment variable")
    );
}

function getGitHubCliToken(): ResultAsync<string, Error> {
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

function getRepositoryUrl(): ResultAsync<string, Error> {
    return executeGit(["remote", "get-url", "origin"]).map((url: string): string => url.trim());
}

export function getRepository(): ResultAsync<Repository, Error> {
    return getRepositoryUrl().andThen((url: string): Result<Repository, Error> => {
        const result: Result<RepositoryObject, Error> = extractRepository(url);
        if (result.isOk()) {
            const ownerRepo = `${result.value.owner}/${result.value.repo}` as Repository;
            logger.verbose(`Fetched repository: ${ownerRepo}`);
            return ok(ownerRepo);
        }
        return err(result.error);
    });
}

export function extractRepository(url: string): Result<RepositoryObject, Error> {
    const cleanUrl: string = url.trim().replace(/\.git$/, "");

    const sshMatch: RegExpMatchArray | null = cleanUrl.match(/^git@github\.com:([^/]+)\/(.+)$/);
    if (sshMatch) {
        const [, owner, name] = sshMatch;
        if (!name) {
            return err(new Error("Invalid repository URL format"));
        }
        if (!owner) {
            return err(new Error("Invalid repository URL format"));
        }

        return ok({ owner: owner, repo: name });
    }

    const httpsMatch: RegExpMatchArray | null = cleanUrl.match(/^https:\/\/github\.com\/([^/]+)\/(.+)$/);
    if (httpsMatch) {
        const [, owner, repo] = httpsMatch;
        if (!repo) {
            return err(new Error("Invalid repository URL format"));
        }
        if (!owner) {
            return err(new Error("Invalid repository URL format"));
        }

        return ok({ owner: owner, repo: repo });
    }

    return err(
        new Error(
            "Invalid repository URL format. Expected SSH (git@github.com:owner/repo) or HTTPS (https://github.com/owner/repo)"
        )
    );
}
