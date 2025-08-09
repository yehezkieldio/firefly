import z from "zod";
import { VALID_TEMPLATE_PLACEHOLDERS } from "#/shared/constants";
import { BumpStrategySchema, PreReleaseBaseSchema, ReleaseTypeSchema } from "#/shared/types/versioning.types";

const BaseFireflyConfigSchema = z.object({
    /**
     * The unscoped project name to be released.
     * If not provided, it will be auto-detected from package.json.
     * If a scope exists, it is excluded from the name.
     */
    name: z.string().optional(),

    /**
     * The organization or user scope for the project, without the "@" prefix.
     * - If not provided, Firefly will attempt to auto-detect the scope from package.json.
     * - To explicitly disable scope (even if package.json is scoped), set this to an empty string "".
     * - If provided, the scope will be included in the project name.
     * This enables advanced control for monorepos, unscoped releases, or custom naming strategies.
     */
    scope: z.string().optional(),

    /**
     * Relative path from the repository root to the project root.
     * Useful for monorepos or projects not at the repository root.
     */
    base: z.string().default(""),

    /**
     * Whether the release is being run in a CI environment.
     */
    ci: z.boolean().default(false),

    /**
     * Repository identifier in "owner/repo" format.
     * Auto-detected from Git configuration or remote origin if not provided.
     */
    repository: z
        .string()
        .regex(/^[\w.-]+\/[\w.-]+$/, "Repository must be in 'owner/repo' format")
        .or(z.literal(""))
        .default(""),

    /**
     * Path to the changelog file. Defaults to "CHANGELOG.md".
     * Must include the file name, relative to the project root.
     */
    changelogPath: z.string().min(1, "Changelog path cannot be empty").default("CHANGELOG.md"),

    /**
     * Enables verbose logging for detailed output.
     * When enabled, logs all progress, internal state, execution steps, data flow, and decision points.
     */
    verbose: z.boolean().default(false),

    /**
     * Enables dry run mode to simulate the release process without changes.
     */
    dryRun: z.boolean().default(false),

    /**
     * Determines the version bumping strategy.
     * - "auto": Release type is determined from commit messages (releaseType ignored).
     * - "manual": User specifies the release type, will prompt for bump choices if releaseType is not provided.
     */
    bumpStrategy: BumpStrategySchema,

    /**
     * Release type for version bumping.
     * Only used when bumpStrategy is "manual". Ignored when bumpStrategy is "auto".
     * If not provided with manual strategy, user will be prompted to select.
     */
    releaseType: ReleaseTypeSchema,

    /**
     * Identifier for pre-release versions (e.g., "alpha", "beta").
     * Used as the pre-release tag.
     *
     * This can be any string, including commit-based identifiers like `"canary.$(git rev-parse --short HEAD)"`.
     * If not specified, defaults to "alpha".
     */
    preReleaseId: z.string().min(1, "Pre-release ID cannot be empty").default("alpha"),

    /**
     * Starting version for pre-releases, typically "0" or "1".
     */
    preReleaseBase: PreReleaseBaseSchema,

    /**
     * Custom release notes for the version bump.
     * To include these in the changelog, configure the "message" field in your git-cliff config (see: https://git-cliff.org/docs/usage/adding-tag-messages).
     */
    releaseNotes: z.string().default(""),

    /**
     * Commit message template for the version bump.
     * Supports placeholders: {{name}}, {{unscopedName}}, {{version}}.
     *
     * {{name}} in this case is the full project name, including scope if it exists.
     * {{unscopedName}} is the project name without scope.
     * {{version}} is the new version number.
     */
    commitMessage: z
        .string()
        .min(1, "Commit message cannot be empty")
        .default("chore(release): release {{name}}@{{version}}"),

    /**
     * Tag name template for the version bump.
     * Supports placeholders: {{name}}, {{unscopedName}}, {{version}}.
     *
     * {{name}} in this case is the full project name, including scope if it exists.
     * {{unscopedName}} is the project name without scope.
     * {{version}} is the new version number.
     */
    tagName: z.string().min(1, "Tag name cannot be empty").default("{{name}}@{{version}}"),

    /**
     * Whether to skip the version bump step.
     * This is useful for scenarios where you want to generate a changelog without actually bumping the version.
     */
    skipBump: z.boolean().default(false),

    /**
     * Whether to skip the changelog generation step.
     * This is useful for scenarios where you want to perform a version bump without generating a changelog.
     */
    skipChangelog: z.boolean().default(false),

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
     * Whether to skip the GitHub release step.
     */
    skipGitHubRelease: z.boolean().default(false),

    /**
     * Whether to skip all git-related steps (commit, tag, push, GitHub release).
     */
    skipGit: z.boolean().default(false),

    /**
     * Specify the release title for the GitHub release.
     * Supports placeholders: {{name}}, {{unscopedName}}, {{version}}.
     *
     * {{name}} in this case is the full project name, including scope if it exists.
     * {{unscopedName}} is the project name without scope.
     * {{version}} is the new version number.
     */
    releaseTitle: z.string().min(1, "Release title cannot be empty").default("{{name}}@{{version}}"),

    /**
     * Whether to release as a latest version.
     * Cannot be true when releasePreRelease is true.
     */
    releaseLatest: z.boolean().default(true),

    /**
     * Whether to release as a pre-release version.
     * This is GitHub only, and is used to mark the release as a pre-release on GitHub.
     * Cannot be true when releaseLatest is true.
     */
    releasePreRelease: z.boolean().default(false),

    /**
     * Whether to release as a draft version.
     * This is GitHub only, and is used to create a draft release on GitHub.
     */
    releaseDraft: z.boolean().default(false),

    /**
     * The branch to create the release on.
     * If not specified, attempts to use the current branch.
     */
    branch: z.string().optional(),
});

export const FireflyConfigSchema = BaseFireflyConfigSchema.check((ctx) => {
    // Ensure mutual exclusivity between releaseLatest and releasePreRelease
    // These two flags represent distinct release modes and cannot be enabled simultaneously.
    if (ctx.value.releaseLatest && ctx.value.releasePreRelease) {
        ctx.issues.push({
            code: "custom",
            message: "releaseLatest and releasePreRelease cannot both be true",
            input: ctx.value,
            path: ["releaseLatest"],
        });
        ctx.issues.push({
            code: "custom",
            message: "releaseLatest and releasePreRelease cannot both be true",
            input: ctx.value,
            path: ["releasePreRelease"],
        });
    }

    // When bumpStrategy is set to "auto", the release type is determined from commit messages.
    // In this mode, specifying a releaseType is redundant and can cause conflicts,
    // except when explicitly performing a "prerelease" bump which requires a releaseType.
    if (
        ctx.value.bumpStrategy === "auto" &&
        ctx.value.releaseType !== undefined &&
        ctx.value.releaseType !== "prerelease"
    ) {
        ctx.issues.push({
            code: "custom",
            message: "releaseType should not be specified when bumpStrategy is 'auto', except for 'prerelease'",
            input: ctx.value,
            path: ["releaseType"],
        });
    }

    // When bumpStrategy is set to "manual", and CI is enabled, check if releaseType is present
    if (ctx.value.bumpStrategy === "manual" && ctx.value.ci && ctx.value.releaseType === undefined) {
        ctx.issues.push({
            code: "custom",
            message: "releaseType must be specified when bumpStrategy is 'manual' and CI is enabled",
            input: ctx.value,
            path: ["releaseType"],
        });
    }

    const templateFields = [
        { field: "commitMessage", value: ctx.value.commitMessage },
        { field: "tagName", value: ctx.value.tagName },
        { field: "releaseTitle", value: ctx.value.releaseTitle },
    ];

    // Validate that only supported placeholders are used in template fields
    for (const { field, value } of templateFields) {
        const placeholders = value.match(/\{\{([^}]+)\}\}/g) || [];

        for (const placeholder of placeholders) {
            if (!VALID_TEMPLATE_PLACEHOLDERS.includes(placeholder)) {
                ctx.issues.push({
                    code: "custom",
                    message: `Invalid placeholder "${placeholder}" in ${field}. Valid placeholders are: ${VALID_TEMPLATE_PLACEHOLDERS.join(", ")}`,
                    input: ctx.value,
                    path: [field],
                });
            }
        }
    }
});

export type _FireflyConfig = z.infer<typeof FireflyConfigSchema>;
