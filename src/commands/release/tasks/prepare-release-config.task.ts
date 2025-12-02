import { parse as parseVersion } from "semver";
import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { zip3Async } from "#/core/result/result.utilities";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";
import type { PackageJson } from "#/services/contracts/package-json.interface";

interface HydratedConfig {
    repository?: string;
    name?: string;
    scope?: string;
    preReleaseId?: string;
    branch?: string;
}

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
 *
 * Behavior:
 * - If not inside a git repository, resolves to undefined.
 * - If inside a repository, detect the repository URL
 *   using a fall-through strategy (upstream remote → origin → first remote).
 * - Parses the URL and returns "owner/repo" when possible.
 */
function hydrateRepository(ctx: ReleaseContext): FireflyAsyncResult<string | undefined> {
    return ctx.services.git
        .inferRepositoryUrl()
        .map((url) => {
            if (!url) {
                return null;
            }
            const parsed = parseGitRemoteUrl(url);
            if (parsed) {
                const repo = `${parsed.owner}/${parsed.repo}`;
                return repo;
            }
            return null;
        })
        .map((val) => val ?? undefined)
        .andTee((repository) => logger.verbose(`PrepareReleaseConfigTask: Prepared repository: ${repository}`));
}

/**
 * Hydrates name, scope, and preReleaseId from package.json.
 *
 * Behavior:
 * - If package.json does not exist, returns all values as undefined.
 * - If it exists, reads package.json and returns parsed results for name, scope and preReleaseId.
 */
function hydrateFromPackageJson(
    ctx: ReleaseContext
): FireflyAsyncResult<{ name?: string; scope?: string; preReleaseId?: string }> {
    return ctx.services.fs.exists("package.json").andThen((exists) => {
        if (!exists) {
            return FireflyOkAsync({ name: undefined, scope: undefined, preReleaseId: undefined });
        }

        return ctx.services.packageJson.read("package.json").andThen((pkg) =>
            zip3Async(
                hydrateNameFromPackageJson(ctx, pkg),
                hydrateScopeFromPackageJson(ctx, pkg),
                hydratePreReleaseIdFromPackageJson(ctx, pkg)
            ).map(([name, scope, preReleaseId]) => {
                const result: { name?: string; scope?: string; preReleaseId?: string } = {};
                if (name) result.name = name;
                if (scope) result.scope = scope;
                if (preReleaseId) result.preReleaseId = preReleaseId;
                return result;
            })
        );
    });
}

/**
 * Hydrates the `name` field from package.json when not provided in config.
 *
 * Cases:
 * 1. If name is undefined and package.json has no name, returns a validation error.
 * 2. If name is undefined and package.json has a name, extracts the name (stripping scope) and returns it.
 * 3. Otherwise uses provided name.
 */
function hydrateNameFromPackageJson(ctx: ReleaseContext, packageJson: PackageJson): FireflyAsyncResult<string> {
    // Case 1: If config.name is not undefined (not provided) and package.json name is also missing
    if (ctx.config.name === undefined && !packageJson.name) {
        return validationErrAsync({
            message: "Could not find a valid name in package.json",
        });
    }

    // Case 2: hydrate the config name from package.json if not provided (undefined)
    if (ctx.config.name === undefined && packageJson.name) {
        const extractedName = parsePackageName(packageJson.name).name;
        logger.verbose(`PrepareReleaseConfigTask: Prepared name from package.json: ${extractedName}`);
        return FireflyOkAsync(extractedName);
    }

    logger.verbose(`PrepareReleaseConfigTask: Using provided name: "${ctx.config.name}" as it is explicitly set`);
    return FireflyOkAsync(ctx.config.name as string);
}

/**
 * Hydrates the `scope` field from package.json when not provided in config.
 *
 * Cases:
 * 1. If scope is explicitly provided (key exists and value is not undefined), it is used.
 * 2. If not provided, but package.json has a scoped `name` (e.g., "@scope/name"), the scope will be extracted and returned.
 * 3. Otherwise returns undefined.
 */
function hydrateScopeFromPackageJson(
    ctx: ReleaseContext,
    packageJson: PackageJson
): FireflyAsyncResult<string | undefined> {
    // Check if scope was explicitly provided in the original config (including empty string)
    // We consider scope explicitly provided if:
    // Case 1: The key exists AND the value is not undefined (covers empty string case)
    const scopedExplicitlyProvided = Object.hasOwn(ctx.config, "scope") && ctx.config.scope !== undefined;
    if (scopedExplicitlyProvided) {
        logger.verbose(`PrepareReleaseConfigTask: Using provided scope: "${ctx.config.scope}" as it is explicitly set`);
        return FireflyOkAsync(ctx.config.scope);
    }

    // Case 2: hydrate scope if package.json has a scoped name and scope wasn't explicitly provided
    if (packageJson.name?.startsWith("@")) {
        const parsed = parsePackageName(packageJson.name);
        if (parsed.scope) {
            logger.verbose(`PrepareReleaseConfigTask: Prepared scope from package.json: ${parsed.scope}`);
            return FireflyOkAsync(parsed.scope);
        }
    }

    logger.verbose("PrepareReleaseConfigTask: No scope to prepare from package.json");
    return FireflyOkAsync(undefined);
}

/**
 * Hydrates the `preReleaseId` field from `package.json.version` when not provided.
 *
 * Cases:
 * 1. If preReleaseId is explicitly provided and not an empty string, it is used.
 * 2. If not provided, and `package.json.version` contains a prerelease segment, the prerelease identifier will be extracted and returned.
 * 3. Otherwise the function defaults to "alpha".
 */
function hydratePreReleaseIdFromPackageJson(
    ctx: ReleaseContext,
    packageJson: PackageJson
): FireflyAsyncResult<string | undefined> {
    // Check if preReleaseId was explicitly provided in the original config (including empty string)
    // We consider preReleaseId explicitly provided if:
    // Case 1: The key exists AND the value is not undefined (covers empty string case)
    const preReleaseProvided = ctx.config.preReleaseId !== undefined && ctx.config.preReleaseId.trim() !== "";
    if (preReleaseProvided) {
        logger.verbose(
            `PrepareReleaseConfigTask: Using provided preReleaseId: "${ctx.config.preReleaseId}" as it is explicitly set`
        );
        return FireflyOkAsync(ctx.config.preReleaseId);
    }

    // Case 2: hydrate preReleaseId from package.json version if it has a pre-release segment
    if (packageJson.version) {
        const parsed = parseVersion(packageJson.version);
        if (!parsed) {
            return validationErrAsync({
                message: `Invalid version format in package.json: ${packageJson.version}`,
            });
        }

        if (parsed.prerelease.length > 0 && typeof parsed.prerelease[0] === "string") {
            const preReleaseId = extractPreReleaseId(packageJson.version);
            logger.verbose(`PrepareReleaseConfigTask: Prepared preReleaseId from package.json: ${preReleaseId}`);
            return FireflyOkAsync(preReleaseId);
        }
    }

    logger.verbose("PrepareReleaseConfigTask: No preReleaseId to prepare from package.json, defaulting to 'alpha'");
    return FireflyOkAsync("alpha");
}

/**
 * Hydrates branch setting from git.
 *
 * Behavior:
 * - If not inside a git repository, resolves to undefined.
 * - If a branch is explicitly provided in the config, validates it against the
 *   current git branch and returns it (otherwise returns a validation error).
 * - If no branch is provided in the config, uses current git branch.
 */
function hydrateBranch(ctx: ReleaseContext): FireflyAsyncResult<string | undefined> {
    return ctx.services.git.isInsideRepository().andThen((isRepo) => {
        if (!isRepo) {
            return FireflyOkAsync(undefined);
        }

        return ctx.services.git.getCurrentBranch().andThen((currentBranch) => {
            // Check if branch was explicitly provided in the original config (including empty string).
            // We consider a branch explicitly provided when the key exists and the value is not undefined
            // and not empty after trimming.
            const branchExplicitlyProvided =
                Object.hasOwn(ctx.config, "branch") &&
                ctx.config.branch !== undefined &&
                ctx.config.branch.trim() !== "";

            // If branch is explicitly provided, validate it matches the current branch
            // Case 1: Branch explicitly provided in config
            if (branchExplicitlyProvided) {
                if (ctx.config.branch !== currentBranch) {
                    return validationErrAsync({
                        message: `Configured branch "${ctx.config.branch}" does not match current git branch "${currentBranch}"`,
                    });
                }

                logger.verbose(
                    `PrepareReleaseConfigTask: Using provided branch: "${ctx.config.branch}" as it is explicitly set`
                );
                return FireflyOkAsync(ctx.config.branch);
            }

            // Case 2: No branch provided in config, use current branch from git
            logger.verbose(`PrepareReleaseConfigTask: Prepared branch from git: ${currentBranch}`);
            return FireflyOkAsync(currentBranch);
        });
    });
}

/**
 * Creates the Prepare Release Config Task.
 *
 * This task determines and hydrates configuration settings, by inferring values from the environment.
 *
 * This task:
 * 1. Detects repository owner/repo from git remote URL
 * 2. Extracts name and scope from package.json
 * 3. Extracts preReleaseId from package.json version
 * 4. Detects current git branch if not provided
 */
export function createPrepareReleaseConfigTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prepare-release-config")
        .description("Hydrate and prepare the release configuration")
        .execute((ctx) => {
            const hydrated: HydratedConfig = {};
            return zip3Async(hydrateRepository(ctx), hydrateFromPackageJson(ctx), hydrateBranch(ctx)).map(
                ([repository, pkgData, branch]) => {
                    if (repository) hydrated.repository = repository;
                    if (pkgData.name) hydrated.name = pkgData.name;
                    if (pkgData.scope) hydrated.scope = pkgData.scope;
                    if (pkgData.preReleaseId) hydrated.preReleaseId = pkgData.preReleaseId;
                    if (branch) hydrated.branch = branch;

                    logger.verbose(`PrepareReleaseConfigTask: Hydrated config: ${JSON.stringify(hydrated)}`);
                    return ctx.fork("hydratedConfig", hydrated);
                }
            );
        })
        .build();
}
