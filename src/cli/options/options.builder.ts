import type { Command } from "commander";
import type { ZodObject, ZodRawShape } from "zod";
import z from "zod";
import { camelToKebab } from "#/cli/options/options.utilities";
import {
    createEnumValidator,
    createGenericValidator,
    createLiteralUnionValidator,
    createNumberValidator,
    createStringValidator,
    extractEnumValues,
    extractLiteralValues,
} from "#/cli/options/options.validation";

/**
 * Context object containing all information needed to register a single CLI option.
 */
interface OptionContext {
    /**
     * The Commander command to register the option on.
     */
    command: Command;

    /**
     * The schema key (camelCase).
     */
    key: string;

    /**
     * The raw Zod field (may include wrappers like optional/default).
     */
    rawField: z.ZodType;

    /**
     * The unwrapped inner Zod field.
     */
    field: z.ZodType;

    /**
     * The Commander option flag string (e.g., "-bt, --bump-strategy").
     */
    optionFlag: string;

    /**
     * The kebab-case option name.
     */
    optionName: string;

    /**
     * The option description from the Zod schema.
     */
    description: string;

    /**
     * The default value extracted from the schema.
     */
    parsedDefault: unknown;
}

/**
 * Builds and registers Commander.js CLI options from Zod schemas.
 *
 * Automatically converts Zod schema definitions into Commander options with:
 * - Appropriate type parsing (string, number, enum, boolean)
 * - Default value extraction
 * - Description from schema metadata
 * - Shorthand aliases for common options
 *
 * @example
 * ```ts
 * const builder = new OptionsBuilder();
 * builder.registerGlobalOptions(program);
 * builder.registerCommandOptions(releaseCmd, ReleaseConfigSchema);
 * ```
 */
export class OptionsBuilder {
    /**
     * Mapping of schema keys to their shorthand CLI flags.
     */
    private readonly shorthandMap = new Map<string, string>([
        ["bumpStrategy", "bt"],
        ["releaseType", "rt"],
    ]);

    /**
     * Fields that are handled by global options and should be skipped for command options.
     */
    private readonly skipFields = new Set(["cwd", "dryRun", "verbose", "enableRollback"]);

    /**
     * Registers global options that apply to all commands.
     *
     * @param program - The root Commander program instance
     */
    registerGlobalOptions(program: Command): void {
        program
            .option("-C, --cwd <path>", "The working directory for all operations")
            .option("--dry-run", "Run without making actual changes")
            .option("--verbose", "Enable verbose logging")
            .option("--no-enable-rollback", "Disable automatic rollback on failure");
    }

    /**
     * Registers command-specific options from a Zod schema.
     *
     * Iterates through the schema shape and creates Commander options
     * for each field, skipping global options.
     *
     * @param command - The Commander command to register options on
     * @param schema - The Zod schema defining the command's options
     */
    registerCommandOptions<T extends ZodRawShape>(command: Command, schema: ZodObject<T>): void {
        for (const [key, rawField] of Object.entries(schema.shape)) {
            if (!rawField || this.skipFields.has(key)) continue;

            const ctx = this.buildOptionContext(command, key, rawField as z.ZodType);
            if (ctx) this.registerOption(ctx);
        }
    }

    /**
     * Builds the context object for registering a single option.
     *
     * @param command - The Commander command
     * @param key - The schema key
     * @param rawField - The raw Zod field
     * @returns The option context, or null if the option already exists
     */
    private buildOptionContext(command: Command, key: string, rawField: z.ZodType): OptionContext | null {
        const field = this.unwrapSchema(rawField);
        const optionName = camelToKebab(key);
        const shorthand = this.shorthandMap.get(key);
        const shorthandPrefix = shorthand && shorthand.length === 1 ? "-" : "--";
        const optionFlag = shorthand ? `${shorthandPrefix}${shorthand}, --${optionName}` : `--${optionName}`;

        const hasExistingOption = command.options.some(
            (opt) => opt.long === `--${optionName}` || (shorthand && opt.short === `${shorthandPrefix}${shorthand}`)
        );

        if (hasExistingOption) return null;

        const parsedDefault = this.extractDefaultValue(key, rawField);
        const description = (rawField as unknown as { description?: string }).description ?? "";

        return { command, key, rawField, field, optionFlag, optionName, description, parsedDefault };
    }

    /**
     * Extracts the default value from a Zod field by parsing an empty object.
     *
     * @param key - The schema key
     * @param rawField - The raw Zod field
     * @returns The default value, or undefined if none
     */
    private extractDefaultValue(key: string, rawField: z.ZodType): unknown {
        const single = z.object({ [key]: rawField }).partial();
        const parseResult = single.safeParse({});
        return parseResult.success ? (parseResult.data as Record<string, unknown>)[key] : undefined;
    }

    /**
     * Registers a single option based on its type.
     *
     * @param ctx - The option context
     */
    private registerOption(ctx: OptionContext): void {
        const { command, rawField, field, optionFlag, description } = ctx;

        if (this.isBooleanField(rawField)) {
            // Boolean flags don't take arguments - they're simple presence flags
            command.option(optionFlag, description);
            return;
        }

        if (field instanceof z.ZodNumber) {
            this.registerNumberOption(ctx);
            return;
        }

        if (field instanceof z.ZodEnum) {
            this.registerEnumOption(ctx);
            return;
        }

        if (field instanceof z.ZodString) {
            this.registerStringOption(ctx);
            return;
        }

        this.registerGenericOption(ctx);
    }

    /**
     * Registers a number option with numeric parsing and validation.
     *
     * @param ctx - The option context
     */
    private registerNumberOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const validator = createNumberValidator(rawField, optionName);
        command.option(`${optionFlag} <${optionName}>`, description, validator, parsedDefault as number | undefined);
    }

    /**
     * Registers an enum option with choice validation.
     *
     * @param ctx - The option context
     */
    private registerEnumOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const choices = extractEnumValues(rawField) ?? [];
        const validator = createEnumValidator(rawField, optionName, choices);
        const fullDescription = `${description}${choices.length ? ` (choices: ${choices.join(", ")})` : ""}`;
        command.option(
            `${optionFlag} <${optionName}>`,
            fullDescription,
            validator,
            parsedDefault as string | undefined
        );
    }

    /**
     * Registers a string option with validation.
     *
     * @param ctx - The option context
     */
    private registerStringOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const validator = createStringValidator(rawField, optionName);
        command.option(`${optionFlag} <${optionName}>`, description, validator, parsedDefault as string | undefined);
    }

    /**
     * Registers a generic option for other Zod types.
     * Handles union types with literal values specially for better error messages.
     *
     * @param ctx - The option context
     */
    private registerGenericOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;

        // Check if this is a union of literals (e.g., z.union([z.literal("0"), z.literal("1")]))
        const literalValues = extractLiteralValues(rawField);
        if (literalValues) {
            const validator = createLiteralUnionValidator(rawField, optionName, literalValues);
            const displayValues = literalValues.map((v) => (typeof v === "string" ? v : String(v)));
            const fullDescription = `${description} (choices: ${displayValues.join(", ")})`;
            command.option(`${optionFlag} <${optionName}>`, fullDescription, validator, parsedDefault);
            return;
        }

        // Check if this is an enum (possibly in a union like z.enum([...]).or(z.literal("")))
        const enumValues = extractEnumValues(rawField);
        if (enumValues) {
            const validator = createEnumValidator(rawField, optionName, enumValues);
            const fullDescription = `${description} (choices: ${enumValues.join(", ")})`;
            command.option(`${optionFlag} <${optionName}>`, fullDescription, validator, parsedDefault);
            return;
        }

        // Fall back to generic validation
        const validator = createGenericValidator(rawField, optionName);
        command.option(`${optionFlag} <${optionName}>`, description, validator, parsedDefault);
    }

    /**
     * Gets the internal definition object from a Zod type.
     * Handles both modern Zod v4 (_zod.def) and legacy (_def) structures.
     *
     * @param field - The raw Zod field
     * @returns The internal definition object
     */
    private getInternalDef(field: z.ZodType): {
        innerType?: z.ZodType;
        schema?: z.ZodType;
        values?: readonly string[];
    } {
        const zodContainer = (field as unknown as { _zod?: { def?: unknown } })._zod;
        if (zodContainer?.def) {
            return zodContainer.def as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
        }

        const legacy = (field as unknown as { _def?: unknown })._def;
        return (legacy ?? {}) as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
    }

    /**
     * Unwraps Zod wrapper types (optional, default, etc.) to get the inner type.
     *
     * @param field - The raw Zod field
     * @returns The unwrapped Zod type
     */
    private unwrapSchema(field: z.ZodType): z.ZodType {
        if (field instanceof z.ZodDefault) {
            const inner = this.getInternalDef(field).innerType;
            return inner ? this.unwrapSchema(inner) : field;
        }

        if (field instanceof z.ZodOptional) {
            const inner = this.getInternalDef(field).innerType;
            return inner ? this.unwrapSchema(inner) : field;
        }

        if (field instanceof z.ZodUnknown) {
            const schema = this.getInternalDef(field).schema;
            return schema ? this.unwrapSchema(schema) : field;
        }

        return field;
    }

    /**
     * Checks if a field is a boolean type (possibly wrapped).
     *
     * @param rawField - The raw Zod field
     * @returns True if the field is boolean, false otherwise
     */
    private isBooleanField(rawField: z.ZodType): boolean {
        const def = this.getInternalDef(rawField);
        const inner = (def.innerType ?? def.schema) as z.ZodType | undefined;
        return inner instanceof z.ZodBoolean;
    }
}
