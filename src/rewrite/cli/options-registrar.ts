import type { Command } from "commander";
import type { ZodObject, ZodRawShape } from "zod";

/**
 * Registers CLI options from Zod schemas.
 */
export class OptionsRegistrar {
    /**
     * Register global options that apply to all commands.
     */
    registerGlobalOptions(program: Command): void {
        program
            .option("-c, --config <path>", "Path to configuration file")
            .option("--dry-run", "Run without making actual changes")
            .option("--verbose", "Enable verbose logging")
            .option("--no-enable-rollback", "Disable automatic rollback on failure");
    }

    /**
     * Register command-specific options from Zod schema.
     */
    registerCommandOptions(command: Command, schema: ZodObject<ZodRawShape>): void {
        const shape = schema.shape;

        // Skip certain fields that are handled globally or internally
        const skipFields = new Set(["config", "dryRun", "verbose", "enableRollback"]);

        for (const [key, value] of Object.entries(shape)) {
            if (skipFields.has(key)) {
                continue;
            }

            const option = this.createOption(key, value);
            if (option) {
                command.option(option.flags, option.description, option.defaultValue);
            }
        }
    }

    /**
     * Create an option definition from a Zod schema field.
     */
    private createOption(
        key: string,
        zodType: any,
    ): { flags: string; description: string; defaultValue?: any } | null {
        // Convert camelCase to kebab-case for CLI flags
        const flagName = this.camelToKebab(key);

        // Determine option type and description
        const typeName = zodType._def?.typeName;
        let description = zodType._def?.description || `Set ${flagName}`;
        let defaultValue: any;

        // Extract default value if present
        if (zodType._def?.defaultValue !== undefined) {
            defaultValue = zodType._def.defaultValue();
        }

        // Handle different Zod types
        switch (typeName) {
            case "ZodBoolean": {
                // Boolean flags
                if (defaultValue === true) {
                    return { flags: `--no-${flagName}`, description: `Disable ${flagName}` };
                }
                return { flags: `--${flagName}`, description };
            }

            case "ZodString": {
                return { flags: `--${flagName} <value>`, description, defaultValue };
            }

            case "ZodNumber": {
                return { flags: `--${flagName} <number>`, description, defaultValue };
            }

            case "ZodEnum": {
                const values = zodType._def?.values || [];
                description += ` (${values.join(", ")})`;
                return { flags: `--${flagName} <value>`, description, defaultValue };
            }

            case "ZodArray": {
                return { flags: `--${flagName} <items...>`, description, defaultValue };
            }

            case "ZodOptional":
            case "ZodNullable": {
                // Recurse into the wrapped type
                return this.createOption(key, zodType._def.innerType);
            }

            case "ZodDefault": {
                // Recurse with default value
                defaultValue = zodType._def.defaultValue();
                return this.createOption(key, zodType._def.innerType);
            }

            default: {
                // For complex types or unknown types, create a generic string option
                return { flags: `--${flagName} <value>`, description, defaultValue };
            }
        }
    }

    /**
     * Convert camelCase to kebab-case.
     */
    private camelToKebab(str: string): string {
        return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
}
