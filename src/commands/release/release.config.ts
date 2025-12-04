import z from "zod";
import { PreReleaseBaseSchema, ReleaseTypeSchema } from "#/domain/semver/semver.definitions";
import { BumpStrategySchema } from "#/domain/semver/semver.strategies";

export const COMMIT_MSG_TEMPLATE = "chore(release): release {{name}}@{{version}}";
export const TAG_NAME_TEMPLATE = "{{name}}@{{version}}";
export const RELEASE_TITLE_TEMPLATE = "{{name}}@{{version}}";

interface SkipFlags {
    skipBump: boolean;
    skipChangelog: boolean;
    skipGit: boolean;
    skipGitHubRelease: boolean;
    skipPush: boolean;
}

interface ReleaseFlagsInput {
    releaseLatest: boolean;
    releasePreRelease: boolean;
    releaseDraft: boolean;
}

interface BumpConfigInput {
    bumpStrategy: string;
    releaseType?: string;
}

type ConfigInput = SkipFlags & ReleaseFlagsInput & BumpConfigInput;

interface CheckContext {
    value: ConfigInput;
    issues: Array<{ code: string; message: string; input: ConfigInput; path?: string[] }>;
}

function validateReleaseFlagExclusivity(ctx: CheckContext): void {
    const flagNames = ["releaseLatest", "releasePreRelease", "releaseDraft"] as const;
    // Only count flags that are explicitly set to true (not undefined)
    const setFlags = flagNames.filter((k) => ctx.value[k] === true);

    if (setFlags.length > 1) {
        ctx.issues.push({
            code: "custom",
            message: `Only one of ${flagNames.join(", ")} can be set to true.`,
            input: ctx.value,
            path: ["releaseLatest"],
        });
    }
}

function validateSkipGitRedundancy(ctx: CheckContext): void {
    if (ctx.value.skipGit && ctx.value.skipPush) {
        ctx.issues.push({
            code: "custom",
            message: "skipPush should not be set when skipGit is true.",
            input: ctx.value,
        });
    }
}

function validateBumpStrategyCompatibility(ctx: CheckContext): void {
    const { bumpStrategy, releaseType } = ctx.value;
    if (bumpStrategy === "auto" && releaseType !== undefined && releaseType !== "prerelease") {
        ctx.issues.push({
            code: "custom",
            message: "When bumpStrategy is 'auto', releaseType can only be 'prerelease' if specified.",
            input: ctx.value,
        });
    }
}

function validateSkipFlagCombinations(ctx: CheckContext): void {
    const { skipBump, skipChangelog, skipGit, skipGitHubRelease } = ctx.value;

    // Nothing to do: skipping everything produces no output
    if (skipBump && skipChangelog && skipGit && skipGitHubRelease) {
        ctx.issues.push({
            code: "custom",
            message:
                "Invalid configuration: skipBump, skipChangelog, skipGit, and skipGitHubRelease are all enabled. Nothing to do.",
            input: ctx.value,
        });
        return;
    }

    // No changes to commit/tag: skipBump + skipChangelog without skipGit is pointless
    if (skipBump && skipChangelog && !skipGit) {
        ctx.issues.push({
            code: "custom",
            message:
                "Invalid configuration: skipBump and skipChangelog are enabled without skipGit. There are no changes to commit or tag.",
            input: ctx.value,
        });
    }

    // GitHub release requires a tag: skipGit without skipGitHubRelease won't work
    if (skipGit && !skipGitHubRelease) {
        ctx.issues.push({
            code: "custom",
            message:
                "Invalid configuration: skipGit is enabled without skipGitHubRelease. GitHub releases require a git tag.",
            input: ctx.value,
        });
    }
}

export const ReleaseConfigSchema = z
    .object({
        name: z.string().optional().describe("Unscoped project name. Auto-detected from package.json."),
        scope: z.string().optional().describe("Org/user scope without '@'. Auto-detected from package.json."),
        base: z.string().default("").describe("Relative path from repository root to project root."),
        branch: z.string().optional().describe("Git branch to release from."),
        changelogPath: z.string().default("CHANGELOG.md").describe("Changelog file path, relative to project root."),

        bumpStrategy: BumpStrategySchema.describe('"auto" (from commits) or "manual" (user-specified).'),
        releaseType: ReleaseTypeSchema.optional().describe("The release type to bump."),

        preReleaseId: z.string().optional().describe('Pre-release ID (e.g., "alpha", "beta").'),
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
        releaseLatest: z.coerce.boolean().optional().describe("Mark as latest release."),
        releasePreRelease: z.coerce.boolean().optional().describe("Mark as pre-release."),
        releaseDraft: z.coerce.boolean().optional().describe("Release as draft version."),
    })
    .check((ctx) => {
        validateReleaseFlagExclusivity(ctx as unknown as CheckContext);
        validateSkipGitRedundancy(ctx as unknown as CheckContext);
        validateBumpStrategyCompatibility(ctx as unknown as CheckContext);
        validateSkipFlagCombinations(ctx as unknown as CheckContext);
    });

type BaseRelease = z.infer<typeof ReleaseConfigSchema>;
export type ReleaseFlagKeys = "releaseLatest" | "releasePreRelease" | "releaseDraft";

export type ExclusiveReleaseFlags =
    | { releaseLatest: true; releasePreRelease?: false | undefined; releaseDraft?: false | undefined }
    | { releasePreRelease: true; releaseLatest?: false | undefined; releaseDraft?: false | undefined }
    | { releaseDraft: true; releaseLatest?: false | undefined; releasePreRelease?: false | undefined }
    | { releaseLatest?: false | undefined; releasePreRelease?: false | undefined; releaseDraft?: false | undefined };

export type ReleaseConfig = Omit<BaseRelease, ReleaseFlagKeys> & ExclusiveReleaseFlags;
