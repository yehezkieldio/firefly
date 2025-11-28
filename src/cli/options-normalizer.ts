import type { ZodObject, ZodRawShape } from "zod";
import type { CLIOptions } from "#/cli/types";

/**
 * Normalizes CLI options by mapping kebab-case keys to camelCase keys
 * expected by configuration schemas. Handles the mismatch between Commander's
 * automatic kebab-to-camelCase conversion and Zod schema field names.
 */
export class OptionNormalizer {
    /**
     * Normalizes CLI options using the provided schema to determine key mappings.
     *
     * @param options - Raw CLI options from Commander
     * @param schema - Zod schema defining the expected configuration shape
     * @returns Normalized options with properly mapped keys
     */
    normalize<T extends ZodRawShape>(options: CLIOptions, schema: ZodObject<T>): CLIOptions {
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

    private buildMappingFromSchema<T extends ZodRawShape>(schema: ZodObject<T>): Map<string, string> {
        const mappings = new Map<string, string>();
        const shape = schema.shape;

        for (const camelKey of Object.keys(shape)) {
            const kebabKey = OptionNormalizer.toKebab(camelKey);
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
     * Handles special cases like "GitHub" -> "github".
     */
    static toKebab(camelCase: string): string {
        return camelCase
            .replace(/GitHub/g, "Github")
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .toLowerCase()
            .replace(/_/g, "-");
    }
}
