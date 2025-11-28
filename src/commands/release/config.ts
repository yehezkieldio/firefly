import z from "zod";

/**
 * Defines the base version for a pre-release.
 * Accepts either a number or the string "0" or "1", representing the starting point of the pre-release cycle.
 * This field is optional to allow flexibility in pre-release versioning.
 */
export const PreReleaseBaseSchema = z.union([z.number(), z.literal("0"), z.literal("1")]).optional();
export type PreReleaseBase = z.infer<typeof PreReleaseBaseSchema>;

/**
 * The bump strategy determines which versioning strategy to use when bumping versions.
 * - "auto": Automatically determine the version bump based on commit messages.
 * - "manual": Manually specify the version bump, will generate selection options based on current version.
 */
export const BUMP_STRATEGY_AUTO = "auto" as const;
export const BUMP_STRATEGY_MANUAL = "manual" as const;

export const BumpStrategyValues = [BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL] as const;
export const BumpStrategySchema = z.enum(BumpStrategyValues).or(z.literal("")).default("");

/**
 * Represents the type of version bump decision to be made.
 * If not specified, the user will be prompted to select a release decision.
 */
export const ReleaseTypeValues = [
    // standard releases
    "major",
    "minor",
    "patch",
    // pre-releases
    "prerelease",
    "premajor",
    "preminor",
    "prepatch",
    // graduate from a pre-release
    "graduate",
] as const;

export const ReleaseTypeSchema = z.enum(ReleaseTypeValues);
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;

export const COMMIT_MSG_TEMPLATE = "chore(release): release {{name}}@{{version}}";
export const TAG_NAME_TEMPLATE = "{{name}}@{{version}}";
export const RELEASE_TITLE_TEMPLATE = "{{name}}@{{version}}";

export const ReleaseConfigSchema = z
    .object({
        name: z.string().optional().describe("Unscoped project name. Auto-detected from package.json."),
        scope: z.string().optional().describe("Org/user scope without '@'. Auto-detected from package.json."),
        base: z.string().default("").describe("Relative path from repository root to project root."),
        changelogPath: z.string().default("CHANGELOG.md").describe("Changelog file path, relative to project root."),

        bumpStrategy: BumpStrategySchema.describe('"auto" (from commits) or "manual" (user-specified).'),
        releaseType: ReleaseTypeSchema.optional().describe("The release type to bump."),

        preReleaseId: z.string().default("alpha").describe('Pre-release ID (e.g., "alpha", "beta").'),
        preReleaseBase: PreReleaseBaseSchema.describe("Starting version for pre-releases."),

        releaseNotes: z.string().default("").describe("Custom release notes for changelog."),

        commitMessage: z.string().default(COMMIT_MSG_TEMPLATE).describe("Commit message template with placeholders."),
        tagName: z.string().default(TAG_NAME_TEMPLATE).describe("Tag name template with placeholders."),

        skipBump: z.coerce.boolean().default(false).describe("Skip version bump step."),
        skipChangelog: z.coerce.boolean().default(false).describe("Skip changelog generation step."),
        skipPush: z.coerce.boolean().default(false).describe("Skip push step."),
        skipGitHubRelease: z.coerce.boolean().default(false).describe("Skip GitHub release step."),
        skipGit: z.coerce.boolean().default(false).describe("Skip all git-related steps."),
        skipPreflightCheck: z.coerce.boolean().default(false).describe("Skip preflight checks."),

        releaseTitle: z.string().default(RELEASE_TITLE_TEMPLATE).describe("GitHub release title with placeholders."),
        releaseLatest: z.coerce.boolean().default(true).describe("Mark as latest release."),
        releasePreRelease: z.coerce.boolean().default(false).describe("Mark as pre-release."),
        releaseDraft: z.coerce.boolean().default(false).describe("Release as draft version."),
    })
    .check((ctx) => {
        const flagNames = ["releaseLatest", "releasePreRelease", "releaseDraft"] as const;
        const setFlags = flagNames.filter((k) => Boolean((ctx.value as Record<string, unknown>)[k]));

        // Only one of releaseLatest, releasePreRelease, or releaseDraft may be true.
        if (setFlags.length > 1) {
            ctx.issues.push({
                code: "custom",
                message: `Only one of ${flagNames.join(", ")} can be set to true.`,
                input: ctx.value,
                path: ["releaseLatest"],
            });
        }

        // When skipGit is true, skipPush is redundant and should not be set.
        if (ctx.value.skipGit && ctx.value.skipPush) {
            ctx.issues.push({
                code: "custom",
                message: "skipPush should not be set when skipGit is true.",
                input: ctx.value,
            });
        }

        // When bumpStrategy is "auto", explicit releaseType values (other than allowed ones) are invalid.
        if (
            ctx.value.bumpStrategy === "auto" &&
            ctx.value.releaseType !== undefined &&
            ctx.value.releaseType !== "prerelease"
        ) {
            ctx.issues.push({
                code: "custom",
                message: "When bumpStrategy is 'auto', releaseType can only be 'prerelease' if specified.",
                input: ctx.value,
            });
        }
    });

export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
