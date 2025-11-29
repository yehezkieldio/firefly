/**
 * CLI option name normalizer.
 *
 * Handles the conversion between Commander.js option names (kebab-case)
 * and Zod schema keys (camelCase). This ensures consistent option handling
 * regardless of how the option was specified (CLI vs config file).
 *
 * @internal
 */

import type { ZodObject, ZodRawShape } from "zod";
import type { ParsedCLIOptions } from "#/cli/internal-types";

/**
 * Normalizes CLI option names between Commander.js and Zod schema conventions.
 *
 * Commander.js converts kebab-case flags (e.g., `--dry-run`) to camelCase keys
 * in the parsed options object. However, the internal representation may differ
 * from the schema keys. This class ensures all option keys match the schema.
 *
 * @example
 * ```ts
 * const normalizer = new OptionsNormalizer();
 * const normalized = normalizer.normalize(cliOptions, ReleaseConfigSchema);
 * // Ensures all keys match the schema's camelCase keys
 * ```
 */
export class OptionsNormalizer {
    /**
     * Normalizes parsed CLI options to match Zod schema keys.
     *
     * Converts any Commander-style keys to their corresponding schema keys.
     * For example, if Commander produces `enableRollback` but the schema
     * expects `enableRollback`, this ensures consistency.
     *
     * @param options - Raw options from Commander.js
     * @param schema - The Zod schema defining expected option keys
     * @returns Normalized options with keys matching the schema
     */
    normalize<T extends ZodRawShape>(options: ParsedCLIOptions, schema: ZodObject<T>): ParsedCLIOptions {
        const mappings = this.buildMappingFromSchema(schema);
        const normalized = { ...options };

        for (const [commanderKey, schemaKey] of mappings) {
            if (commanderKey in normalized && !(schemaKey in normalized)) {
                const value = (normalized as Record<string, unknown>)[commanderKey];
                (normalized as Record<string, unknown>)[schemaKey] = value;
                delete (normalized as Record<string, unknown>)[commanderKey];
            }
        }

        return normalized;
    }

    /**
     * Builds a mapping from Commander keys to schema keys.
     *
     * Analyzes the schema shape and creates a map for any keys that
     * would be transformed by Commander's kebab-to-camel conversion.
     *
     * @param schema - The Zod schema to extract keys from
     * @returns Map of Commander keys to schema keys
     */
    private buildMappingFromSchema<T extends ZodRawShape>(schema: ZodObject<T>): Map<string, string> {
        const mappings = new Map<string, string>();
        const shape = schema.shape;

        for (const camelKey of Object.keys(shape)) {
            const kebabKey = OptionsNormalizer.toKebab(camelKey);
            if (kebabKey !== camelKey) {
                // Commander converts --kebab-case to kebabCase (removing dashes)
                const commanderKey = kebabKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
                mappings.set(commanderKey, camelKey);
            }
        }

        return mappings;
    }

    /**
     * Converts a camelCase string to kebab-case.
     *
     * Handles special cases like "GitHub" → "github" to ensure
     * consistent CLI flag naming.
     *
     * @param camelCase - The camelCase string to convert
     * @returns The kebab-case equivalent
     *
     * @example
     * ```ts
     * OptionsNormalizer.toKebab("bumpStrategy") // "bump-strategy"
     * OptionsNormalizer.toKebab("enableGitHubRelease") // "enable-github-release"
     * ```
     */
    static toKebab(camelCase: string): string {
        return camelCase
            .replace(/GitHub/g, "Github")
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .toLowerCase()
            .replace(/_/g, "-");
    }
}
