import { parse as parseVersion } from "semver";
import type { ReleaseConfig } from "#/commands/release/release.config";
import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import type { PreReleaseBase } from "#/domain/semver/semver.definitions";
import { logger } from "#/infrastructure/logging";
import type { PackageJson } from "#/services/contracts/package-json.interface";

const HTTPS_REMOTE_REGEX = /https?:\/\/[^/]+\/([^/]+)\/([^/.]+)(?:\.git)?/;
const SSH_REMOTE_REGEX = /git@[^:]+:([^/]+)\/([^/.]+)(?:\.git)?/;
const SCOPED_PACKAGE_REGEX = /^@([^/]+)\/(.+)$/;
const PRERELEASE_REGEX = /^\d+\.\d+\.\d+-([a-zA-Z]+)/;

/**
 * Terminologies:
 *
 * Prepared: The value has been determined and set in the context.
 * Using: The value was explicitly provided in the config and is used as-is.
 */

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
function extractPreReleaseID(version: string): string | undefined {
    const match = version.match(PRERELEASE_REGEX);
    return match?.[1];
}

/**
 * Extracts the prerelease numeric base (if present) from a semver version string.
 *
 * @example
 * extractPreReleaseBase("1.0.0-beta.1") // 1
 * extractPreReleaseBase("1.0.0") // undefined
 */
function extractPreReleaseBase(version: string): number | undefined {
    const parsed = parseVersion(version);
    if (!parsed) return undefined;
    if (parsed.prerelease.length > 1 && typeof parsed.prerelease[1] === "number") {
        return parsed.prerelease[1] as number;
    }
    return undefined;
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
 * Hydrates the `preReleaseID` field from `package.json.version` when not provided.
 *
 * Cases:
 * 1. If preReleaseID is explicitly provided and not an empty string, it is used.
 * 2. If not provided, and `package.json.version` contains a prerelease segment, the prerelease identifier will be extracted and returned.
 * 3. Otherwise the function defaults to "alpha".
 */
function hydratePreReleaseIDFromPackageJson(
    ctx: ReleaseContext,
    packageJson: PackageJson
): FireflyAsyncResult<string | undefined> {
    // Check if preReleaseId was explicitly provided in the original config
    const preReleaseExplicitlyProvided =
        Object.hasOwn(ctx.config, "preReleaseID") && ctx.config.preReleaseID !== undefined;
    if (preReleaseExplicitlyProvided) {
        logger.verbose(
            `PrepareReleaseConfigTask: Using provided preReleaseID: "${ctx.config.preReleaseID}" as it is explicitly set`
        );
        return FireflyOkAsync(ctx.config.preReleaseID);
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
            const preReleaseID = extractPreReleaseID(packageJson.version);
            logger.verbose(`PrepareReleaseConfigTask: Prepared preReleaseID from package.json: ${preReleaseID}`);
            return FireflyOkAsync(preReleaseID);
        }
    }

    logger.verbose("PrepareReleaseConfigTask: No preReleaseID to prepare from package.json, defaulting to 'alpha'");
    return FireflyOkAsync("alpha");
}

/**
 * Hydrates the `preReleaseBase` field.
 *
 * Behavior:
 * - If explicitly provided in config (key exists and value is not undefined) use as-is.
 * - Otherwise default to 0.
 *
 * Note: we do NOT infer `preReleaseBase` from package.json anymore.
 */
function hydratePreReleaseBase(ctx: ReleaseContext): FireflyAsyncResult<number | "0" | "1"> {
    const baseMaybe = ctx.config.preReleaseBase;
    const baseExplicitlyProvided = Object.hasOwn(ctx.config, "preReleaseBase") && baseMaybe !== undefined;
    if (baseExplicitlyProvided) {
        logger.verbose(
            `PrepareReleaseConfigTask: Using provided preReleaseBase: "${ctx.config.preReleaseBase}" as it is explicitly set`
        );
        const base: Exclude<PreReleaseBase, undefined> = baseMaybe as Exclude<PreReleaseBase, undefined>;
        return FireflyOkAsync(base);
    }

    logger.verbose("PrepareReleaseConfigTask: No preReleaseBase explicitly provided, defaulting to 0");
    return FireflyOkAsync(0);
}

/**
 * Hydrates name, scope, and preReleaseId from package.json.
 *
 * Behavior:
 * - If package.json does not exist, returns all values as undefined.
 * - If it exists, reads package.json and returns parsed results for name, scope and preReleaseId.
 * - If preReleaseBase is explicitly provided in config, it is used as-is, if not, it defaults to 0.
 */
function hydrateFromPackageJson(
    ctx: ReleaseContext
): FireflyAsyncResult<{ name?: string; scope?: string; preReleaseID?: string; preReleaseBase?: number | "0" | "1" }> {
    return ctx.services.fs.exists("package.json").andThen((exists) => {
        if (!exists) {
            return FireflyOkAsync({
                name: undefined,
                scope: undefined,
                preReleaseID: undefined,
                preReleaseBase: undefined,
            });
        }

        return ctx.services.packageJson.read("package.json").andThen((pkg) =>
            hydrateNameFromPackageJson(ctx, pkg).andThen((name) =>
                hydrateScopeFromPackageJson(ctx, pkg).andThen((scope) =>
                    hydratePreReleaseIDFromPackageJson(ctx, pkg).andThen((preReleaseId) =>
                        hydratePreReleaseBase(ctx).map((preReleaseBase: number | "0" | "1") => {
                            const result: {
                                name?: string;
                                scope?: string;
                                preReleaseId?: string;
                                preReleaseBase?: number | "0" | "1";
                            } = {};
                            if (name) result.name = name;
                            if (scope) result.scope = scope;
                            if (preReleaseId) result.preReleaseId = preReleaseId;
                            if (preReleaseBase !== undefined) result.preReleaseBase = preReleaseBase;
                            return result;
                        })
                    )
                )
            )
        );
    });
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
function hydrateRepository(ctx: ReleaseContext): FireflyAsyncResult<string> {
    return ctx.services.git
        .inferRepositoryUrl()
        .andThen((url) => {
            if (!url) {
                return validationErrAsync({
                    message: "Could not determine git remote URL to infer repository information",
                });
            }

            const parsed = parseGitRemoteUrl(url);
            if (parsed) {
                const repo = `${parsed.owner}/${parsed.repo}`;
                return FireflyOkAsync(repo);
            }

            return validationErrAsync({
                message: `Could not parse repository information from git remote URL: ${url}`,
            });
        })
        .andTee((repository) => logger.verbose(`PrepareReleaseConfigTask: Prepared repository: ${repository}`));
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
 * Hydrates repository and branch information from git.
 *
 * Behavior:
 * - If not inside a git repository, resolves both values to undefined.
 * - Otherwise it composes `hydrateRepository` and `hydrateBranch` and returns both values.
 */
function hydrateFromGit(ctx: ReleaseContext): FireflyAsyncResult<{ repository?: string; branch?: string }> {
    return ctx.services.git.isInsideRepository().andThen((isRepo) => {
        if (!isRepo) {
            return FireflyOkAsync({ repository: undefined, branch: undefined });
        }

        return hydrateRepository(ctx).andThen((repository) =>
            hydrateBranch(ctx).map((branch) => {
                const result: { repository?: string; branch?: string } = {};
                if (repository) result.repository = repository;
                if (branch) result.branch = branch;
                return result;
            })
        );
    });
}

/**
 * Hydrates release flags (releaseLatest, releasePreRelease, releaseDraft).
 *
 * Behavior:
 * - If exactly one flag is explicitly set to true, use that and set others to false.
 * - If no flags are explicitly set, default to releaseLatest = true, others = false.
 * - Validation of exclusivity is handled by the schema, so we only need to determine defaults.
 */
function hydrateReleaseFlags(
    ctx: ReleaseContext
): FireflyAsyncResult<{ releaseLatest: boolean; releasePreRelease: boolean; releaseDraft: boolean }> {
    const { releaseLatest, releasePreRelease, releaseDraft } = ctx.config;

    // Check which flags are explicitly set to true
    const latestExplicit = releaseLatest === true;
    const preReleaseExplicit = releasePreRelease === true;
    const draftExplicit = releaseDraft === true;

    // Case 1: releasePreRelease is explicitly set to true
    if (preReleaseExplicit) {
        logger.verbose(`PrepareReleaseConfigTask: Using "releasePreRelease" as it is explicitly set`);
        return FireflyOkAsync({ releaseLatest: false, releasePreRelease: true, releaseDraft: false });
    }

    // Case 2: releaseDraft is explicitly set to true
    if (draftExplicit) {
        logger.verbose(`PrepareReleaseConfigTask: Using "releaseDraft" as it is explicitly set`);
        return FireflyOkAsync({ releaseLatest: false, releasePreRelease: false, releaseDraft: true });
    }

    // Case 3: releaseLatest is explicitly set to true
    if (latestExplicit) {
        logger.verbose(`PrepareReleaseConfigTask: Using "releaseLatest" as it is explicitly set`);
        return FireflyOkAsync({ releaseLatest: true, releasePreRelease: false, releaseDraft: false });
    }

    // Case 4: No flags explicitly set, default to releaseLatest
    logger.verbose("PrepareReleaseConfigTask: Prepared releaseLatest as default since no flag was explicitly set");
    return FireflyOkAsync({ releaseLatest: true, releasePreRelease: false, releaseDraft: false });
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
 * 5. Determines release flags (latest, preRelease, draft) with proper defaults
 */
export function createPrepareReleaseConfigTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prepare-release-config")
        .description("Hydrate and prepare the release configuration")
        .execute((ctx) => {
            const hydrated: Partial<ReleaseConfig> = {};

            return hydrateFromGit(ctx)
                .andThen((gitData) => {
                    if (gitData.repository) hydrated.repository = gitData.repository;
                    if (gitData.branch) hydrated.branch = gitData.branch;

                    return hydrateFromPackageJson(ctx);
                })
                .andThen((pkgData) => {
                    if (pkgData.name) hydrated.name = pkgData.name;
                    if (pkgData.scope) hydrated.scope = pkgData.scope;
                    if (pkgData.preReleaseID) hydrated.preReleaseID = pkgData.preReleaseID;
                    if (pkgData.preReleaseBase !== undefined) hydrated.preReleaseBase = pkgData.preReleaseBase;

                    return hydrateReleaseFlags(ctx);
                })
                .map((releaseFlags) => {
                    hydrated.releaseLatest = releaseFlags.releaseLatest;
                    hydrated.releasePreRelease = releaseFlags.releasePreRelease;
                    hydrated.releaseDraft = releaseFlags.releaseDraft;

                    return ctx.forkConfig(hydrated);
                });
        })
        .build();
}
