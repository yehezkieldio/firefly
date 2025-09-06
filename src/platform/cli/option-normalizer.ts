import type { ZodObject, ZodRawShape } from "zod";
import { type CommandName, ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import type { CLIOptions } from "#/platform/cli/commander";

export class CLIOptionNormalizer {
    private toKebab(camelCase: string): string {
        return camelCase
            .replace(/GitHub/g, "Github") // Handle "GitHub" as a special case first
            .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert dash between lowercase and uppercase
            .toLowerCase()
            .replace(/_/g, "-");
    }

    private buildMappingFromSchema<T extends ZodRawShape>(schema: ZodObject<T>): Map<string, string> {
        const mappings = new Map<string, string>();
        const shape = schema.shape;

        for (const camelKey of Object.keys(shape)) {
            const kebabKey = this.toKebab(camelKey);
            if (kebabKey !== camelKey) {
                const commanderKey = kebabKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                mappings.set(commanderKey, camelKey);
            }
        }

        return mappings;
    }

    normalize(options: CLIOptions, commandName?: CommandName): CLIOptions {
        const schema = commandName ? ConfigSchemaProvider.get(commandName) : ConfigSchemaProvider.get();
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
}
