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
}
