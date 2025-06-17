import { errAsync, ok, okAsync, type Result, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { CWD_PACKAGE_PATH } from "#/infrastructure/constants";
import { type PackageJson, pkgJson } from "#/infrastructure/fs";
import { extractRepository, getRepository, type Repository } from "#/infrastructure/git";
import { getRepositoryUsingGitHubCLI } from "#/infrastructure/hosting/github";
import { logger } from "#/infrastructure/logging";
import type { OptionalBumpStrategy, OptionalReleaseType, PreReleaseBase } from "#/types";

export interface ArtemisOptions {
    /**
     * The non-scoped name of the project to be released. Defaults to the package name in package.json.
     * @default ""
     * @example "my-package"
     * @flag --name
     */
    name: string;

    /**
     * The organization or user scope for the project WITHOUT the @ symbol.
     * @default ""
     * @example "my-org"
     * @flag --scope
     */
    scope: string;

    /**
     * The base path where the project is located. Particularly useful for monorepos.
     * @default ""
     * @example "packages/my-package"
     * @flag --base
     */
    base: string;

    /**
     * Repository identifier for the project with the format "owner/repo".
     * @default ""
     * @example "my-org/my-repo"
     * @flag --repository
     */
    repository: string;

    /**
     * The path to the changelog file.
     * @default "CHANGELOG.md"
     * @example "CHANGELOG.md"
     * @flag --changelog-path
     */
    changelogPath: string;

    /**
     * Enable verbose logging for detailed output.
     * @default false
     * @flag --verbose
     */
    verbose: boolean;

    /**
     * Enable dry run mode to simulate the release process without making any changes.
     * @default false
     * @flag --dry-run
     */
    dryRun: boolean;

    /**
     * Determine the bumping strategy for the release.
     * @default "manual"
     * @flag --bump-strategy
     */
    bumpStrategy: OptionalBumpStrategy;

    /**
     * Specify the release type for the version bump.
     * @default ""
     * @flag --release-type
     */
    releaseType: OptionalReleaseType;

    /**
     * Specify the pre-release identifier for the version bump.
     * @default ""
     * @flag --pre-release-id
     */
    preReleaseId: string;

    /**
     * Specify the pre-release base version.
     * @default "0"
     * @flag --pre-release-base
     */
    preReleaseBase: PreReleaseBase;

    /**
     * Specify the release notes for the version bump.
     * @default ""
     * @flag --release-notes
     */
    releaseNotes: string;

    /**
     * Specify the commit message for the version bump.
     * @default "chore(release): release {{name}}@{{version}}"
     * @flag --commit-message
     */
    commitMessage: string;

    /**
     * Specify the tag name for the version bump.
     * @default "{{name}}@{{version}}"
     * @flag --tag-name
     */
    tagName: string;

    /**
     * Whether to skip the version bump in the changelog.
     * @default false
     * @flag --skip-bump
     */
    skipBump: boolean;

    /**
     * Whether to skip the changelog generation step.
     * @default false
     * @flag --skip-changelog
     */
    skipChangelog: boolean;

    /**
     * Whether to skip the GitHub release step.
     * @default false
     * @flag --skip-github-release
     */
    skipGitHubRelease: boolean;

    /**
     * Whether to skip the GitLab release step.
     * @default true
     * @flag --skip-gitlab-release
     */
    skipGitLabRelease: boolean;

    /**
     * Whether to skip the commit step.
     * @default false
     * @flag --skip-commit
     */
    skipCommit: boolean;

    /**
     * Whether to skip the tag creation step.
     * @default false
     * @flag --skip-tag
     */
    skipTag: boolean;

    /**
     * Whether to skip the push step.
     * @default false
     * @flag --skip-push
     */
    skipPush: boolean;

    /**
     * Specify the release title for the release notes.
     * @default "{{name}}@{{version}}"
     * @flag --release-title
     */
    releaseTitle: string;

    /**
     * Whether to release as a latest version.
     * @default true
     * @flag --release-latest
     */
    releaseLatest: boolean;

    /**
     * Whether to release as a pre-release version.
     * @default false
     * @flag --release-prerelease
     */
    releasePreRelease: boolean;

    /**
     * Whether to release as a draft version.
     * @default false
     * @flag --release-draft
     */
    releaseDraft: boolean;

    /**
     * The branch to create the release on.
     * @default "master"
     * @example "master"
     * @flag --branch
     */
    branch: string;
}

export const defaultArtemisOptions: ArtemisOptions = {
    name: "",
    scope: "",
    base: "",
    repository: "",
    changelogPath: "CHANGELOG.md",
    verbose: false,
    dryRun: false,
    bumpStrategy: "",
    releaseType: "",
    preReleaseBase: "0",
    preReleaseId: "",
    releaseNotes: "",
    commitMessage: "chore(release): release {{name}}@{{version}}",
    tagName: "{{name}}@{{version}}",
    skipBump: false,
    skipChangelog: false,
    skipCommit: false,
    skipGitHubRelease: false,
    skipGitLabRelease: true,
    skipPush: false,
    skipTag: false,
    releaseTitle: "{{name}}@{{version}}",
    releaseLatest: true,
    releaseDraft: false,
    releasePreRelease: false,
    branch: "master"
};

export function mergeOptions(
    cliOptions: Partial<ArtemisOptions>,
    fileOptions: Partial<ArtemisOptions>
): Result<ArtemisOptions, Error> {
    const merged: ArtemisOptions = { ...defaultArtemisOptions };

    for (const key of Object.keys(defaultArtemisOptions) as Array<keyof ArtemisOptions>) {
        if (fileOptions[key] !== undefined) {
            (merged[key] as unknown as string | boolean) = fileOptions[key];
        }
    }

    for (const key of Object.keys(defaultArtemisOptions) as Array<keyof ArtemisOptions>) {
        const cliValue = cliOptions[key];

        if (cliValue !== undefined) {
            if (typeof cliValue === "string" && cliValue === "") {
                const currentMergedValue = merged[key];
                if (typeof currentMergedValue === "string" && currentMergedValue !== "") {
                } else {
                    (merged[key] as unknown as string | boolean) = cliValue;
                }
            } else {
                (merged[key] as unknown as string | boolean) = cliValue;
            }
        }
    }

    return ok(merged);
}

export function sanitizeOptions(options: ArtemisOptions): ResultAsync<ArtemisOptions, Error> {
    return handleRepositoryOption(options).andThen(handleNameAndScopeConfiguration);
}

export function handleRepositoryOption(config: ArtemisOptions): ResultAsync<ArtemisOptions, Error> {
    const repoPattern = /^[^/]+\/[^/]+$/;

    function attemptAutoDetectRepository(): ResultAsync<ArtemisOptions, Error> {
        logger.verbose("FileConfiguration: Repository not configured, attempting to detect from git");
        return getRepository()
            .orElse(() => {
                logger.verbose("FileConfiguration: Failed to get repository from git, trying GitHub CLI");
                return getRepositoryUsingGitHubCLI().andThen((url: string): ResultAsync<Repository, Error> => {
                    const result = extractRepository(url);
                    if (result.isOk()) {
                        const ownerRepo = `${result.value.owner}/${result.value.repo}` as Repository;
                        return okAsync(ownerRepo);
                    }
                    return errAsync(result.error);
                });
            })
            .map(
                (repository: Repository): ArtemisOptions => ({
                    ...config,
                    repository
                })
            );
    }

    if (!config.repository || config.repository.trim() === "") {
        return attemptAutoDetectRepository();
    }

    if (!repoPattern.test(config.repository)) {
        return errAsync(new Error("Repository in configuration file must be in the format of <owner>/<repo>"));
    }

    return okAsync(config);
}

export function handleNameAndScopeConfiguration(config: ArtemisOptions): ResultAsync<ArtemisOptions, Error> {
    if (config.name || config.scope) {
        return okAsync(config);
    }

    logger.verbose("FileConfiguration: Name and scope not configured, attempting to detect from package.json");

    return pkgJson
        .readPackageJson(CWD_PACKAGE_PATH)
        .orElse((readError: Error) => {
            logger.warn(`Could not read package.json at ${CWD_PACKAGE_PATH}: ${readError.message}`);
            return okAsync(null);
        })
        .andThen((pkg: PackageJson | null): ResultAsync<ArtemisOptions, Error> => {
            if (!pkg) {
                return okAsync(config);
            }

            const scopeResult = pkgJson.getPackageNameWithScope(pkg);
            if (scopeResult.isOk()) {
                const { name, scope } = scopeResult.value;
                logger.verbose(`FileConfiguration: Detected scoped package: ${scope}/${name}`);
                return okAsync({ ...config, name, scope });
            }

            const nameResult = pkgJson.getPackageName(pkg);
            if (nameResult.isOk()) {
                const name = nameResult.value;
                logger.verbose(`FileConfiguration: Detected package name: ${name}`);
                return okAsync({ ...config, name });
            }

            logger.warn("Could not determine package name or scope from package.json");
            return okAsync(config);
        });
}

export function getFullPackageName(config: ArtemisOptions): string {
    if (config.scope) {
        return `@${config.scope}/${config.name!}`;
    }

    return config.name!;
}

export function resolveCommitMessage(context: ArtemisContext): string {
    let message: string = context.options.commitMessage!;
    const name: string = getFullPackageName(context.options);

    if (message.includes("{{version}}")) {
        message = message.replace("{{version}}", context.nextVersion || "");
    }

    if (message.includes("{{name}}")) {
        message = message.replace("{{name}}", name);
    }

    return message;
}

export function resolveTagName(context: ArtemisContext): string {
    let tagName: string = context.options.tagName!;
    const name: string = getFullPackageName(context.options);

    if (tagName.includes("{{version}}")) {
        tagName = tagName.replace("{{version}}", context.nextVersion || "");
    }

    if (tagName.includes("{{name}}")) {
        tagName = tagName.replace("{{name}}", name);
    }

    logger.verbose("Resolved tag name:", tagName);
    return tagName;
}

export function resolveReleaseTitle(context: ArtemisContext): string {
    let title: string = context.options.releaseTitle!;
    const name: string = getFullPackageName(context.options);

    if (title.includes("{{version}}")) {
        title = title.replace("{{version}}", context.nextVersion || "");
    }

    if (title.includes("{{name}}")) {
        title = title.replace("{{name}}", name);
    }

    return title;
}
