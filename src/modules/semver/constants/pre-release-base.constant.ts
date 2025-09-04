import z from "zod";

/**
 * Defines the base version for a pre-release.
 * Accepts either a number or the string "0" or "1", representing the starting point of the pre-release cycle.
 * This field is optional to allow flexibility in pre-release versioning.
 */
export const PreReleaseBaseSchema = z.union([z.number(), z.literal("0"), z.literal("1")]).optional();
