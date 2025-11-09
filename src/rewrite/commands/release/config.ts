import z from "zod";

/**
 * Release command configuration schema.
 */
export const ReleaseConfigSchema = z.object({
    /**
     * Release type for automatic versioning (patch, minor, major).
     */
    releaseType: z.enum(["patch", "minor", "major"]).optional(),

    /**
     * Bump strategy: automatic (from commits), manual, or prompt.
     */
    bumpStrategy: z.enum(["automatic", "manual", "prompt"]).optional(),

    /**
     * Manual version to use (overrides automatic bump).
     */
    manualVersion: z.string().optional(),

    /**
     * Whether to generate changelog using git-cliff.
     */
    generateChangelog: z.boolean().default(true),

    /**
     * Path to cliff.toml configuration file.
     */
    cliffConfigPath: z.string().default("cliff.toml"),

    /**
     * Whether to commit changes (changelog, version bump).
     */
    commitChanges: z.boolean().default(true),

    /**
     * Custom commit message template.
     */
    commitMessage: z.string().optional(),

    /**
     * Whether to create git tag.
     */
    createTag: z.boolean().default(true),

    /**
     * Whether to push commit and tag to remote.
     */
    push: z.boolean().default(true),

    /**
     * Remote name to push to.
     */
    remoteName: z.string().default("origin"),

    /**
     * Branch name to push to.
     */
    branchName: z.string().default("main"),

    /**
     * Whether to create GitHub/GitLab release.
     */
    createRelease: z.boolean().default(false),

    /**
     * Platform for release (github, gitlab).
     */
    releasePlatform: z.enum(["github", "gitlab"]).default("github"),

    /**
     * Whether to mark release as latest.
     */
    releaseLatest: z.boolean().default(true),

    /**
     * Whether to mark release as pre-release.
     */
    releasePreRelease: z.boolean().default(false),

    /**
     * Whether to mark release as draft.
     */
    releaseDraft: z.boolean().default(false),

    /**
     * Skip git operations (useful for testing).
     */
    skipGit: z.boolean().default(false),
});

export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
