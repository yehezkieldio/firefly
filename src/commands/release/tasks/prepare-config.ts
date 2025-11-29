/**
 * Prepare Release Config Task
 *
 * Hydrates the release configuration by auto-detecting values from
 * the git repository and package.json when not explicitly provided.
 *
 * @module commands/release/tasks/prepare-config
 */

import { okAsync } from "neverthrow";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, type FireflyResult, validationErrAsync } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

interface PackageJson {
    name?: string;
    version?: string;
}

interface HydratedConfig {
    repository?: string;
    branch?: string;
    name?: string;
    scope?: string;
    preReleaseId?: string;
}

// Pre-compiled regex patterns for performance
const HTTPS_REMOTE_REGEX = /https?:\/\/[^/]+\/([^/]+)\/([^/.]+)(?:\.git)?/;
const SSH_REMOTE_REGEX = /git@[^:]+:([^/]+)\/([^/.]+)(?:\.git)?/;
const SCOPED_PACKAGE_REGEX = /^@([^/]+)\/(.+)$/;
const PRERELEASE_REGEX = /^\d+\.\d+\.\d+-([a-zA-Z]+)/;

/**
 * Parses a git remote URL to extract owner and repository name.
 * Supports both HTTPS and SSH formats.
 *
 * @example
 * parseGitRemoteUrl("https://github.com/owner/repo.git") // { owner: "owner", repo: "repo" }
 * parseGitRemoteUrl("git@github.com:owner/repo.git") // { owner: "owner", repo: "repo" }
 */
function parseGitRemoteUrl(url: string): { owner: string; repo: string } | null {
    // HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = url.match(HTTPS_REMOTE_REGEX);
    if (httpsMatch?.[1] && httpsMatch[2]) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    // SSH format: git@github.com:owner/repo.git
    const sshMatch = url.match(SSH_REMOTE_REGEX);
    if (sshMatch?.[1] && sshMatch[2]) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    return null;
}

/**
 * Parses a scoped package name to extract scope and name.
 *
 * @example
 * parsePackageName("@company/tool") // { scope: "company", name: "tool" }
 * parsePackageName("tool") // { scope: undefined, name: "tool" }
 */
function parsePackageName(packageName: string): { scope?: string; name: string } {
    const scopeMatch = packageName.match(SCOPED_PACKAGE_REGEX);
    if (scopeMatch?.[1] && scopeMatch[2]) {
        return { scope: scopeMatch[1], name: scopeMatch[2] };
    }
    return { name: packageName };
}

/**
 * Extracts pre-release identifier from a semver version string.
 *
 * @example
 * extractPreReleaseId("1.0.0-beta.1") // "beta"
 * extractPreReleaseId("1.0.0") // undefined
 */
function extractPreReleaseId(version: string): string | undefined {
    const match = version.match(PRERELEASE_REGEX);
    return match?.[1];
}

/**
 * Hydrates the repository field from git remote URL.
 */
function hydrateRepository(ctx: ReleaseContext): FireflyAsyncResult<string | undefined> {
    return ctx.services.git.isRepository().andThen((isRepo) => {
        if (!isRepo) {
            return okAsync(undefined);
        }

        return ctx.services.git
            .getRemoteUrl()
            .map((url) => {
                const parsed = parseGitRemoteUrl(url);
                if (parsed) {
                    const repo = `${parsed.owner}/${parsed.repo}`;
                    logger.verbose(`  ✓ Hydrated repository: ${repo}`);
                    return repo;
                }
                return null;
            })
            .orElse(() => okAsync(null))
            .map((val) => val ?? undefined);
    });
}

/**
 * Hydrates the branch field - detects current branch.
 */
function hydrateBranch(ctx: ReleaseContext): FireflyAsyncResult<string | undefined> {
    return ctx.services.git.currentBranch().map((branch) => {
        logger.verbose(`  ✓ Detected current branch: ${branch}`);
        return branch;
    });
}

/**
 * Validates that a configured branch exists.
 */
function validateBranch(ctx: ReleaseContext, branch: string): FireflyAsyncResult<void> {
    return ctx.services.git.branchExists(branch).andThen((exists) => {
        if (!exists) {
            return validationErrAsync({
                message: `Configured branch "${branch}" does not exist in the repository.`,
                source: "commands/release/prepare-config",
            });
        }
        logger.verbose(`  ✓ Validated branch exists: ${branch}`);
        return okAsync(undefined);
    });
}

/**
 * Hydrates name and scope from package.json.
 */
function hydrateFromPackageJson(
    ctx: ReleaseContext
): FireflyAsyncResult<{ name?: string; scope?: string; preReleaseId?: string }> {
    return ctx.services.fs.exists("package.json").andThen((exists) => {
        if (!exists) {
            return okAsync({ name: undefined, scope: undefined, preReleaseId: undefined });
        }

        return ctx.services.fs.readJson<PackageJson>("package.json").map((pkg) => {
            const result: { name?: string; scope?: string; preReleaseId?: string } = {};

            // Hydrate name if not provided
            if (ctx.config.name === undefined && pkg.name) {
                const parsed = parsePackageName(pkg.name);
                result.name = parsed.name;
                logger.verbose(`  ✓ Hydrated name from package.json: ${parsed.name}`);

                // Hydrate scope if not explicitly provided (undefined, not empty string)
                if (ctx.config.scope === undefined && parsed.scope) {
                    result.scope = parsed.scope;
                    logger.verbose(`  ✓ Hydrated scope from package.json: ${parsed.scope}`);
                }
            }

            // Hydrate preReleaseId if empty
            if (ctx.config.preReleaseId === "" && pkg.version) {
                const preReleaseId = extractPreReleaseId(pkg.version);
                if (preReleaseId) {
                    result.preReleaseId = preReleaseId;
                    logger.verbose(`  ✓ Hydrated preReleaseId from version: ${preReleaseId}`);
                } else {
                    result.preReleaseId = "alpha";
                    logger.verbose("  ✓ Using default preReleaseId: alpha");
                }
            }

            return result;
        });
    });
}

/**
 * Creates the prepare release config task.
 *
 * This task hydrates the release configuration by:
 * 1. Detecting repository owner/repo from git remote URL
 * 2. Detecting or validating the current branch
 * 3. Extracting name and scope from package.json
 * 4. Extracting preReleaseId from package.json version
 */
export function createPrepareConfigTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prepare-config")
        .description("Hydrate release configuration from environment")
        .dependsOn("release-preflight")
        .execute((ctx) => {
            logger.info("Preparing release configuration...");

            logger.info(JSON.stringify(ctx, null, 2));

            const hydrated: HydratedConfig = {};

            // Hydrate repository
            return hydrateRepository(ctx)
                .andThen((repository) => {
                    if (repository) {
                        hydrated.repository = repository;
                    }

                    // Hydrate branch
                    return hydrateBranch(ctx);
                })
                .andThen((branch) => {
                    if (branch) {
                        hydrated.branch = branch;
                    }

                    // Hydrate from package.json
                    return hydrateFromPackageJson(ctx);
                })
                .andThen((pkgInfo) => {
                    if (pkgInfo.name) hydrated.name = pkgInfo.name;
                    if (pkgInfo.scope) hydrated.scope = pkgInfo.scope;
                    if (pkgInfo.preReleaseId) hydrated.preReleaseId = pkgInfo.preReleaseId;

                    // Store hydrated config in context data
                    logger.info("Configuration prepared successfully");
                    return okAsync(ctx.fork("hydratedConfig", hydrated));
                });
        })
        .build();
}
