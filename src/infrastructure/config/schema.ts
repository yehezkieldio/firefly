import { z } from "zod";

export const BumpStrategySchema = z
    .enum(["auto", "manual", "conventional"] as const)
    .default("auto");

export const ReleaseTypeSchema = z
    .enum([
        "major",
        "minor",
        "patch",
        "prerelease",
        "premajor",
        "preminor",
        "prepatch",
    ] as const)
    .optional();

export const PreReleaseBaseSchema = z.coerce.number().default(0);

export const ArtemisConfigSchema = z.object({
    /**
     * The non-scoped name of the project to be released. Defaults to the package name in package.json.
     */
    name: z.string().default(""),

    /**
     * The organization or user scope for the project WITHOUT the @ symbol.
     */
    scope: z.string().default(""),

    /**
     * The base path where the project is located. Particularly useful for monorepos.
     */
    base: z.string().default(""),

    /**
     * Repository identifier for the project with the format "owner/repo".
     */
    repository: z.string().default(""),

    /**
     * The path to the changelog file.
     */
    changelogPath: z.string().default("CHANGELOG.md"),

    /**
     * Enable verbose logging for detailed output.
     */
    verbose: z.boolean().default(false),

    /**
     * Enable dry run mode to simulate the release process without making any changes.
     */
    dryRun: z.boolean().default(false),

    /**
     * Determine the bumping strategy for the release.
     */
    bumpStrategy: BumpStrategySchema,

    /**
     * Specify the release type for the version bump.
     */
    releaseType: ReleaseTypeSchema,

    /**
     * Specify the pre-release identifier for the version bump.
     */
    preReleaseId: z.string().default(""),

    /**
     * Specify the pre-release base version.
     */
    preReleaseBase: PreReleaseBaseSchema,

    /**
     * Specify the release notes for the version bump.
     */
    releaseNotes: z.string().default(""),

    /**
     * Specify the commit message for the version bump.
     */
    commitMessage: z
        .string()
        .default("chore(release): release {{name}}@{{version}}"),

    /**
     * Specify the tag name for the version bump.
     */
    tagName: z.string().default("{{name}}@{{version}}"),

    /**
     * Whether to skip the version bump in the changelog.
     */
    skipBump: z.boolean().default(false),

    /**
     * Whether to skip the changelog generation step.
     */
    skipChangelog: z.boolean().default(false),

    /**
     * Whether to skip the GitHub release step.
     */
    skipGitHubRelease: z.boolean().default(false),

    /**
     * Whether to skip the GitLab release step.
     */
    skipGitLabRelease: z.boolean().default(true),

    /**
     * Whether to skip the commit step.
     */
    skipCommit: z.boolean().default(false),

    /**
     * Whether to skip the tag creation step.
     */
    skipTag: z.boolean().default(false),

    /**
     * Whether to skip the push step.
     */
    skipPush: z.boolean().default(false),

    /**
     * Specify the release title for the release notes.
     */
    releaseTitle: z.string().default("{{name}}@{{version}}"),

    /**
     * Whether to release as a latest version.
     */
    releaseLatest: z.boolean().default(true),

    /**
     * Whether to release as a pre-release version.
     */
    releasePreRelease: z.boolean().default(false),

    /**
     * Whether to release as a draft version.
     */
    releaseDraft: z.boolean().default(false),

    /**
     * The branch to create the release on.
     */
    branch: z.string().default("main"),

    /**
     * GitHub token for authentication (can be provided via env, flag, or gh cli).
     */
    githubToken: z.string().optional(),

    /**
     * GitLab token for authentication.
     */
    gitlabToken: z.string().optional(),
});

export type ArtemisConfig = z.infer<typeof ArtemisConfigSchema>;
export type BumpStrategy = z.infer<typeof BumpStrategySchema>;
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;
export type PreReleaseBase = z.infer<typeof PreReleaseBaseSchema>;
