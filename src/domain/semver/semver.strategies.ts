import z from "zod";

/**
 * The bump strategy determines which versioning strategy to use when bumping versions.
 * - "auto": Automatically determine the version bump based on commit messages.
 * - "manual": Manually specify the version bump, will generate selection options based on current version.
 */
export const BUMP_STRATEGY_AUTO = "auto" as const;
export const BUMP_STRATEGY_MANUAL = "manual" as const;

export const BumpStrategyValues = [BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL] as const;
export const BumpStrategySchema = z.enum(BumpStrategyValues).or(z.literal("")).default("");

export type BumpStrategy = z.infer<typeof BumpStrategySchema>;
