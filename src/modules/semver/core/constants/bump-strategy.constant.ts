import z from "zod";

/**
 * The bump strategy determines which versioning strategy to use when bumping versions.
 * - "auto": Automatically determine the version bump based on commit messages.
 * - "manual": Manually specify the version bump, via generated choices from current version.
 */
export const BumpStrategyValues = ["auto", "manual"] as const;

export const BumpStrategySchema = z.enum(BumpStrategyValues).default("auto");
export type BumpStrategy = z.infer<typeof BumpStrategySchema>;
