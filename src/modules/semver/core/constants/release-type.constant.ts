import z from "zod";

/**
 * Represents the type of version bump to apply.
 * If not specified, the user will be prompted to select a release type.
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

export const ReleaseTypeSchema = z.enum(ReleaseTypeValues).optional();
