import z from "zod";

/**
 * Represents the type of version bump to apply.
 * If not specified, the user will be prompted to select a release type.
 * Includes standard release types and prerelease options, allowing for both new and continued prereleases.
 */
export const ReleaseTypeValues = ["major", "minor", "patch", "prerelease", "premajor", "preminor", "prepatch"] as const;

export const ReleaseTypeSchema = z.enum(ReleaseTypeValues).optional();
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;
