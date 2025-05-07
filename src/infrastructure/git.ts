import { err, ok, okAsync, Result, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { getGitHubCliToken } from "#/infrastructure/hosting/github";
import { getGitLabCliToken } from "#/infrastructure/hosting/gitlab";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";

export type Repository = `${string}/${string}`;

export interface RepositoryObject {
    owner: string;
    repo: string;
}

export function getToken(context: ArtemisContext): ResultAsync<string, Error> {
    // First try environment variables
    const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
    const gitlabToken = process.env.GITLAB_TOKEN || "";
    const genericToken = process.env.TOKEN || "";

    if (githubToken.trim() && !context.options.skipGitHubRelease) {
        logger.verbose("Using GitHub token from environment variables");
        return okAsync(githubToken);
    }

    if (gitlabToken.trim() && context.options.skipGitHubRelease) {
        logger.verbose("Using GitLab token from environment variables");
        return okAsync(gitlabToken);
    }

    if (genericToken.trim()) {
        logger.verbose("Using generic token from environment variables");
        return okAsync(genericToken);
    }

    // If no environment variables, try CLI tokens
    if (!context.options.skipGitHubRelease) {
        logger.verbose("Using token from GitHub CLI");
        return getGitHubCliToken();
    }

    logger.verbose("Using token from GitLab CLI");
    return getGitLabCliToken();
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

    // Handle GitHub SSH URLs
    const githubSshMatch: RegExpMatchArray | null = cleanUrl.match(/^git@github\.com:([^/]+)\/(.+)$/);
    if (githubSshMatch) {
        const [, owner, name] = githubSshMatch;
        if (!name || !owner) {
            return err(new Error("Invalid GitHub SSH repository URL format"));
        }
        return ok({ owner: owner, repo: name });
    }

    // Handle GitHub HTTPS URLs
    const githubHttpsMatch: RegExpMatchArray | null = cleanUrl.match(/^https:\/\/github\.com\/([^/]+)\/(.+)$/);
    if (githubHttpsMatch) {
        const [, owner, repo] = githubHttpsMatch;
        if (!repo || !owner) {
            return err(new Error("Invalid GitHub HTTPS repository URL format"));
        }
        return ok({ owner: owner, repo: repo });
    }

    // Handle GitLab SSH URLs
    const gitlabSshMatch: RegExpMatchArray | null = cleanUrl.match(/^git@gitlab\.com:([^/]+)\/(.+)$/);
    if (gitlabSshMatch) {
        const [, owner, name] = gitlabSshMatch;
        if (!name || !owner) {
            return err(new Error("Invalid GitLab SSH repository URL format"));
        }
        return ok({ owner: owner, repo: name });
    }

    // Handle GitLab HTTPS URLs
    const gitlabHttpsMatch: RegExpMatchArray | null = cleanUrl.match(/^https:\/\/gitlab\.com\/([^/]+)\/(.+)$/);
    if (gitlabHttpsMatch) {
        const [, owner, repo] = gitlabHttpsMatch;
        if (!repo || !owner) {
            return err(new Error("Invalid GitLab HTTPS repository URL format"));
        }
        return ok({ owner: owner, repo: repo });
    }

    // Try to handle custom GitLab instance URLs if GITLAB_HOST is set
    const customGitlabHost = process.env.GITLAB_HOST?.replace(/^https?:\/\//, "");
    if (customGitlabHost) {
        const customSshMatch = cleanUrl.match(new RegExp(`^git@${customGitlabHost}:([^/]+)/(.+)$`));
        if (customSshMatch) {
            const [, owner, name] = customSshMatch;
            if (!name || !owner) {
                return err(new Error("Invalid GitLab SSH repository URL format"));
            }
            return ok({ owner: owner, repo: name });
        }

        const customHttpsMatch = cleanUrl.match(new RegExp(`^https?://${customGitlabHost}/([^/]+)/(.+)$`));
        if (customHttpsMatch) {
            const [, owner, repo] = customHttpsMatch;
            if (!repo || !owner) {
                return err(new Error("Invalid GitLab HTTPS repository URL format"));
            }
            return ok({ owner: owner, repo: repo });
        }
    }

    return err(
        new Error(
            "Invalid repository URL format. Expected GitHub SSH (git@github.com:owner/repo), GitHub HTTPS (https://github.com/owner/repo), GitLab SSH (git@gitlab.com:owner/repo), or GitLab HTTPS (https://gitlab.com/owner/repo)"
        )
    );
}
