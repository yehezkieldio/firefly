import z from "zod";
import {
    COMMIT_MESSAGE_TEMPLATE,
    RELEASE_TITLE_TEMPLATE,
    TAG_NAME_TEMPLATE,
} from "#/modules/configuration/constant/release-templates.constant";
import { BumpStrategySchema } from "#/modules/semver/constants/bump-strategy.constant";
import { PreReleaseBaseSchema } from "#/modules/semver/constants/pre-release-base.constant";
import { ReleaseTypeSchema } from "#/modules/semver/constants/release-type.constant";

export const ReleaseConfigSchema = z
    .object({
        name: z.string().optional().describe("Unscoped project name. Auto-detected from package.json."),
        scope: z.string().optional().describe('Org/user scope without "@". Auto-detected from package.json.'),
        base: z
            .string()
            .default("")
            .describe("Relative path from repository root to project root. Useful for monorepos."),
        changelogPath: z.string().default("CHANGELOG.md").describe("Changelog file path, relative to project root."),

        bumpStrategy: BumpStrategySchema.describe('"auto" (from commits) or "manual" (user-specified).'),
        releaseType: ReleaseTypeSchema.optional().describe("The release type to bump."),

        preReleaseId: z.string().default("alpha").describe('Pre-release ID (e.g., "alpha", "beta").'),
        preReleaseBase: PreReleaseBaseSchema.describe("Starting version for pre-releases."),

        releaseNotes: z.string().default("").describe("Custom release notes for changelog."),

        commitMessage: z
            .string()
            .default(COMMIT_MESSAGE_TEMPLATE)
            .describe("Commit message template with placeholders."),
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
