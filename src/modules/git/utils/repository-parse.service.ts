import { err, ok } from "neverthrow";
import { RepositorySchema } from "#/shared/schema/repository.schema";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

// Common repository URL patterns
const REPOSITORY_PATTERNS = {
    // GitHub patterns
    GITHUB_HTTPS: /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    GITHUB_SSH: /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,

    // GitLab patterns
    GITLAB_HTTPS: /^https:\/\/gitlab\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    GITLAB_SSH: /^git@gitlab\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,

    // Bitbucket patterns
    BITBUCKET_HTTPS: /^https:\/\/bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    BITBUCKET_SSH: /^git@bitbucket\.org:([^/]+)\/([^/]+?)(?:\.git)?$/,

    // Generic Git patterns
    GENERIC_HTTPS: /^https:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    GENERIC_SSH: /^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/,
} as const;

export interface RepositoryInfo {
    owner: string;
    repo: string;
    host?: string;
    protocol: "https" | "ssh";
    fullName: string;
}

export class RepositoryParseService {
    /**
     * Extract repository information from a Git URL
     * @param url The repository URL to parse
     * @returns Repository info or error if URL is invalid
     */
    extractRepository(url: string): FireflyResult<RepositoryInfo> {
        const trimmedUrl = url.trim();

        if (!trimmedUrl) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Repository URL cannot be empty.",
                    source: "git/repository-parse-service",
                }),
            );
        }

        // Try GitHub patterns first (most common)
        const githubHttpsMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GITHUB_HTTPS);
        if (githubHttpsMatch) {
            const owner = githubHttpsMatch[1];
            const repo = githubHttpsMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from GitHub HTTPS URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "github.com", "https");
        }

        const githubSshMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GITHUB_SSH);
        if (githubSshMatch) {
            const owner = githubSshMatch[1];
            const repo = githubSshMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from GitHub SSH URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "github.com", "ssh");
        }

        // Try GitLab patterns
        const gitlabHttpsMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GITLAB_HTTPS);
        if (gitlabHttpsMatch) {
            const owner = gitlabHttpsMatch[1];
            const repo = gitlabHttpsMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from GitLab HTTPS URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "gitlab.com", "https");
        }

        const gitlabSshMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GITLAB_SSH);
        if (gitlabSshMatch) {
            const owner = gitlabSshMatch[1];
            const repo = gitlabSshMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from GitLab SSH URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "gitlab.com", "ssh");
        }

        // Try Bitbucket patterns
        const bitbucketHttpsMatch = trimmedUrl.match(REPOSITORY_PATTERNS.BITBUCKET_HTTPS);
        if (bitbucketHttpsMatch) {
            const owner = bitbucketHttpsMatch[1];
            const repo = bitbucketHttpsMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from Bitbucket HTTPS URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "bitbucket.org", "https");
        }

        const bitbucketSshMatch = trimmedUrl.match(REPOSITORY_PATTERNS.BITBUCKET_SSH);
        if (bitbucketSshMatch) {
            const owner = bitbucketSshMatch[1];
            const repo = bitbucketSshMatch[2];
            if (!(owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract owner and repository name from Bitbucket SSH URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, "bitbucket.org", "ssh");
        }

        // Try generic patterns as fallback
        const genericHttpsMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GENERIC_HTTPS);
        if (genericHttpsMatch) {
            const host = genericHttpsMatch[1];
            const owner = genericHttpsMatch[2];
            const repo = genericHttpsMatch[3];
            if (!(host && owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract repository information from generic HTTPS URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, host, "https");
        }

        const genericSshMatch = trimmedUrl.match(REPOSITORY_PATTERNS.GENERIC_SSH);
        if (genericSshMatch) {
            const host = genericSshMatch[1];
            const owner = genericSshMatch[2];
            const repo = genericSshMatch[3];
            if (!(host && owner && repo)) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: "Failed to extract repository information from generic SSH URL.",
                        source: "git/repository-parse-service",
                    }),
                );
            }
            return this.createRepositoryInfo(owner, repo, host, "ssh");
        }

        return err(
            createFireflyError({
                code: "INVALID",
                message: `Unable to parse repository URL: "${url}". Supported formats include GitHub, GitLab, and Bitbucket URLs.`,
                source: "git/repository-parse-service",
            }),
        );
    }

    /**
     * Validate a repository string in "owner/repo" format
     * @param repository The repository string to validate
     * @returns Validation result
     */
    validateRepositoryString(repository: string): FireflyResult<boolean> {
        const validation = RepositorySchema.safeParse(repository);
        if (!validation.success) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Invalid repository format: "${repository}". Expected format: "owner/repo".`,
                    source: "git/repository-parse-service",
                    details: validation.error.issues,
                }),
            );
        }

        return ok(true);
    }

    /**
     * Parse a repository string in "owner/repo" format
     * @param repository The repository string to parse
     * @returns Repository info or error
     */
    parseRepositoryString(repository: string): FireflyResult<{ owner: string; repo: string }> {
        const validationResult = this.validateRepositoryString(repository);
        if (validationResult.isErr()) return err(validationResult.error);

        if (repository === "") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Repository string cannot be empty.",
                    source: "git/repository-parse-service",
                }),
            );
        }

        const parts = repository.split("/");
        if (parts.length !== 2) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Invalid repository format: "${repository}". Expected format: "owner/repo".`,
                    source: "git/repository-parse-service",
                }),
            );
        }

        const owner = parts[0] || "";
        const repo = parts[1] || "";

        if (owner === "" || repo === "") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Repository owner and name cannot be empty.",
                    source: "git/repository-parse-service",
                }),
            );
        }

        return ok({ owner, repo });
    }

    private createRepositoryInfo(
        owner: string,
        repo: string,
        host: string,
        protocol: "https" | "ssh",
    ): FireflyResult<RepositoryInfo> {
        if (owner === "" || repo === "") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Repository owner and name cannot be empty.",
                    source: "git/repository-parse-service",
                }),
            );
        }

        const fullName = `${owner}/${repo}`;

        // Validate the full name format
        const validationResult = this.validateRepositoryString(fullName);
        if (validationResult.isErr()) return err(validationResult.error);

        return ok({
            owner,
            repo,
            host,
            protocol,
            fullName,
        });
    }
}
