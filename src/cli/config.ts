/**
 * Public configuration API for Firefly CLI.
 *
 * This module exports the configuration schema, types, and helper functions
 * that consumers use to define their `firefly.config.ts` files.
 *
 * @example
 * ```ts
 * // firefly.config.ts
 * import { defineConfig } from "firefly";
 *
 * export default defineConfig({
 *     dryRun: false,
 *     release: {
 *         bumpStrategy: "conventional",
 *     },
 * });
 * ```
 *
 * @module
 */

import z from "zod";
import { GlobalOptionsSchema } from "#/cli/internal-types";
import { ReleaseConfigSchema } from "#/commands/release/config";

/**
 * Complete Firefly configuration schema.
 *
 * Combines global options with command-specific configuration sections.
 * Used for validation and JSON schema generation.
 */
export const FireflyConfigSchema = z
    .object({
        ...GlobalOptionsSchema.shape,
        release: ReleaseConfigSchema.optional().describe("Release command configuration."),
    })
    .describe("Firefly CLI configuration.");

/**
 * TypeScript type for Firefly configuration.
 *
 * Use this type when you need to reference the configuration shape
 * without runtime validation.
 */
export type FireflyConfig = z.infer<typeof FireflyConfigSchema>;

/**
 * Helper function to define a type-safe Firefly configuration.
 *
 * Provides IntelliSense autocompletion and type checking for config files.
 *
 * @param options - The configuration options
 * @returns The same options (identity function for type inference)
 *
 * @example
 * ```ts
 * export default defineConfig({
 *     verbose: true,
 *     release: {
 *         bumpStrategy: "conventional",
 *         releaseType: "github",
 *     },
 * });
 * ```
 */
export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
