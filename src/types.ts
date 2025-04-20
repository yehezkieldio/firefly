import type { ReleaseType } from "semver";

export interface PromptSelectChoice {
    label: string;
    value: string;
    hint?: string;
}

export type EmptyOr<T> = T | "";

export type BumpStrategy = "auto" | "manual";
export type OptionalBumpStrategy = EmptyOr<BumpStrategy>;
export type OptionalReleaseType = EmptyOr<ReleaseType>;

export type PreReleaseBase = "0" | "1";

export interface ArtemisOptions {
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
     * Release as a draft on GitHub.
     * @default false
     * @flag --github-release-draft
     */
    githubReleaseDraft: boolean;

    /**
     * Release as a pre-release on GitHub.
     * @default false
     * @flag --github-release-prerelease
     */
    githubReleasePrerelease: boolean;

    /**
     * Make the release the latest on GitHub.
     * @default true
     * @flag --github-release-latest
     */
    githubReleaseLatest: boolean;
}

export interface ArtemisConfiguration {
    /**
     * The name of the package without the scope.
     * @example "my-package"
     */
    name?: string;

    /**
     * The organization or user scope for the package without the @ symbol.
     * @example "my-org"
     */
    scope?: string;

    /**
     * The base path where the package is located.
     * @example "packages/my-package"
     */
    base?: string;

    /**
     * The GitHub repository URL for the package in the format "owner/repo".
     * @example "my-org/my-repo"
     */
    repository?: string;

    /**
     * The path to the changelog file.
     * @default "CHANGELOG.md"
     */
    changelogPath?: string;

    /**
     * The commit message format for the release.
     * @default "chore(release): release {{name}}@{{version}}"
     */
    commitMessage?: string;

    /**
     * The tag name format for the release.
     * @default "{{name}}@{{version}}"
     */
    tagName?: string;

    /**
     * The tag annotation format for the release.
     * @default "{{name}}@{{version}}"
     */
    tagAnnotation?: string;

    /**
     * The title format for the GitHub release.
     * @default "{{name}}@{{version}}"
     */
    gitHubReleaseTitle?: string;

    /**
     * The branch to push the changes to.
     * @default "master"
     */
    branch?: string;
}

export interface ArtemisContext {
    /**
     * The options provided by the user.
     */
    options: ArtemisOptions;

    /**
     * The configuration provided by the user.
     */
    config: ArtemisConfiguration;

    /**
     * Extracted current version from the package.json file.
     */
    currentVersion: string;

    /**
     * Determined next version based on the bump strategy and release type.
     */
    nextVersion: string;

    /**
     * The generated changelog content based on conventional commits by git-cliff.
     */
    changelogContent: string;
}
