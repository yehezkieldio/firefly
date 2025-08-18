import z from "zod";

/**
 * The bump strategy determines which versioning strategy to use when bumping versions.
 * - "auto": Automatically determine the version bump based on commit messages.
 * - "manual": Manually specify the version bump, will generate selection options based on current version.
 */
export const BumpStrategyValues = ["auto", "manual"] as const;

export const BumpStrategySchema = z.enum(BumpStrategyValues).default("auto");
