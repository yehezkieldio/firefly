import z from "zod";

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

/**
 * Defines the base version for a pre-release.
 * Accepts either a number or the string "0" or "1", representing the starting point of the pre-release cycle.
 * This field is optional to allow flexibility in pre-release versioning.
 */
export const PreReleaseBaseSchema = z.union([z.number(), z.literal("0"), z.literal("1")]).optional();
export type PreReleaseBase = z.infer<typeof PreReleaseBaseSchema>;
