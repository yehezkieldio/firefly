import z from "zod";
import { GlobalOptionsSchema } from "#/cli/options/options.types";
import { ReleaseConfigSchema } from "#/commands/release/release.config";

/**
 * Complete Firefly configuration schema.
 * Combines global options with command-specific configuration sections.
 */
export const FireflyConfigSchema = z
    .object({
        ...GlobalOptionsSchema.shape,
        release: ReleaseConfigSchema.partial().describe("Release command configuration."),
    })
    .partial()
    .describe("Firefly CLI configuration.");

/**
 * TypeScript type for Firefly configuration.
 * Use this type when you need to reference the configuration shape without runtime validation.
 */
export type FireflyConfig = z.infer<typeof FireflyConfigSchema>;
