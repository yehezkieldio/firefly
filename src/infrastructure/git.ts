import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { getGitHubCliToken } from "#/infrastructure/hosting/github";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";

export type Repository = `${string}/${string}`;

export interface RepositoryObject {
    owner: string;
    repo: string;
}

export function getToken(context: ArtemisContext): ResultAsync<string, Error> {
    const token: string = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.TOKEN || "";

    if (token.trim()) {
        logger.verbose("Using token from environment variables");
        return okAsync(token);
    }

    if (!context.options.skipGitHubRelease) {
        logger.verbose("Using token from GitHub CLI");
        return getGitHubCliToken();
    }

    return errAsync(
        new Error(
            "No authentication token provided. Please set GITHUB_TOKEN, GH_TOKEN for publishing to GitHub and GITLAB_TOKEN for GitLab."
        )
    );
}

export function executeGit(args: string[]): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Response(
            Bun.spawn(["git", ...args], {
                stdout: "pipe",
                stderr: "pipe"
            }).stdout
        ).text(),
        (e: unknown): Error => createErrorFromUnknown(e, "Unable to execute git command")
    );
}

export function getGitRootDirection(): ResultAsync<string, Error> {
    return executeGit(["rev-parse", "--show-prefix"])
        .map((path: string): string => path.trim())
        .map((path: string): string => {
            if (path === "") {
                return ".";
            }
            return path
                ?.split("/")
                .map((i) => i.trim())
                .filter(Boolean)
                .map(() => "..")
                .join("/");
        });
}

export function getRepositoryUrl(): ResultAsync<string, Error> {
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
