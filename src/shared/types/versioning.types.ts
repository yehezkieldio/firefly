import z from "zod";

/**
 * The bump strategy determines which versioning strategy to use when bumping versions.
 * - "auto": Automatically determine the version bump based on commit messages.
 * - "manual": Manually specify the version bump, via generated choices from current version.
 */
export const BumpStrategyValues = ["auto", "manual"] as const;
export const BumpStrategySchema = z.enum(BumpStrategyValues).default("auto");
export type BumpStrategy = z.infer<typeof BumpStrategySchema>;
export type BumpStrategyNonOptional = Exclude<BumpStrategy, undefined>;

/**
 * Represents the type of version bump to apply.
 * If not specified, the user will be prompted to select a release type.
 * Includes standard release types and prerelease options, allowing for both new and continued prereleases.
 */
export const ReleaseTypeValues = ["major", "minor", "patch", "prerelease", "premajor", "preminor", "prepatch"] as const;
export const ReleaseTypeSchema = z.enum(ReleaseTypeValues).optional();
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;
export type ReleaseTypeNonOptional = Exclude<ReleaseType, undefined>;

/**
 * Defines the base version for a pre-release.
 * Accepts either a number or the string "0" or "1", representing the starting point of the pre-release cycle.
 * This field is optional to allow flexibility in pre-release versioning.
 */
export const PreReleaseBaseSchema = z.union([z.number(), z.literal("0"), z.literal("1")]).optional();
export type PreReleaseBaseType = z.infer<typeof PreReleaseBaseSchema>;
export type PreReleaseBaseNonOptional = Exclude<PreReleaseBaseType, undefined>;
