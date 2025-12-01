import type { Command } from "commander";
import { err, ok, type Result } from "neverthrow";
import type { ZodObject, ZodRawShape } from "zod";
import z from "zod";
import { parseSchema } from "#/core/result/schema.utilities";

// Result type for option value parsing/validation. */
type ValidationResult<T> = Result<T, string>;

/**
 * Context object containing all information needed to register a single CLI option.
 */
interface OptionContext {
    /** The Commander command to register the option on. */
    command: Command;
    /** The schema key (camelCase). */
    key: string;
    /** The raw Zod field (may include wrappers like optional/default). */
    rawField: z.ZodType;
    /** The unwrapped inner Zod field. */
    field: z.ZodType;
    /** The Commander option flag string (e.g., "-bt, --bump-strategy"). */
    optionFlag: string;
    /** The kebab-case option name. */
    optionName: string;
    /** The option description from the Zod schema. */
    description: string;
    /** The default value extracted from the schema. */
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
     * @returns The option context, or null if the option already exists
     */
    private buildOptionContext(command: Command, key: string, rawField: z.ZodType): OptionContext | null {
        const field = this.unwrapSchema(rawField);
        const optionName = this.camelToKebab(key);
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
     */
    private extractDefaultValue(key: string, rawField: z.ZodType): unknown {
        const single = z.object({ [key]: rawField }).partial();
        const parseResult = single.safeParse({});
        return parseResult.success ? (parseResult.data as Record<string, unknown>)[key] : undefined;
    }

    /**
     * Registers a single option based on its type.
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

    /** Registers a number option with numeric parsing. */
    private registerNumberOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const parser = this.createNumberParser(rawField, optionName);
        const wrappedParser = this.wrapParser(parser);
        command.option(
            `${optionFlag} <${optionName}>`,
            description,
            wrappedParser,
            parsedDefault as number | undefined
        );
    }

    /** Registers an enum option with choice validation. */
    private registerEnumOption(ctx: OptionContext): void {
        const { command, rawField, field, optionFlag, optionName, description, parsedDefault } = ctx;
        const choices = this.getEnumChoices(field);
        const parser = this.createEnumParser(rawField, optionName, choices);
        const wrappedParser = this.wrapParser(parser);
        const fullDescription = `${description}${choices.length ? ` (choices: ${choices.join(", ")})` : ""}`;
        command.option(
            `${optionFlag} <${optionName}>`,
            fullDescription,
            wrappedParser,
            parsedDefault as string | undefined
        );
    }

    /** Registers a string option with validation. */
    private registerStringOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const parser = this.createStringParser(rawField);
        const wrappedParser = this.wrapParser(parser);
        command.option(
            `${optionFlag} <${optionName}>`,
            description,
            wrappedParser,
            parsedDefault as string | undefined
        );
    }

    /** Registers a generic option for other Zod types. */
    private registerGenericOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const parser = this.createGenericParser(rawField);
        const wrappedParser = this.wrapParser(parser);
        command.option(`${optionFlag} <${optionName}>`, description, wrappedParser, parsedDefault);
    }

    /**
     * Wraps a Result-returning parser into a Commander-compatible parser.
     *
     * Commander expects parsers to return values directly or throw on error.
     * This wrapper converts our Result-based parsers to that pattern.
     */
    private wrapParser<T>(parser: (input: string) => ValidationResult<T>): (input: string) => T {
        return (input: string) => {
            const result = parser(input);
            if (result.isErr()) {
                // biome-ignore lint: This is a boundary where we convert from Result back to exceptions
                throw new Error(result.error);
            }
            return result.value;
        };
    }

    /** Creates a parser for number options. */
    private createNumberParser<T>(rawField: z.ZodType, optionName: string): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const num = Number(input);
            if (Number.isNaN(num)) {
                return err(`Invalid number for --${optionName}: ${input}`);
            }

            const result = parseSchema(rawField, num);
            if (result.isErr()) return err(result.error.message);
            return ok(result.value as T);
        };
    }

    /** Creates a parser for enum options. */
    private createEnumParser<T>(
        rawField: z.ZodType,
        optionName: string,
        choices: readonly string[]
    ): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = parseSchema(rawField, input);
            if (result.isErr())
                return err(`Invalid value for --${optionName}: ${input}. Allowed: ${choices.join(", ")}`);
            return ok(result.value as T);
        };
    }

    /** Creates a parser for string options. */
    private createStringParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = parseSchema(rawField, input);
            if (result.isErr()) return err(result.error.message);
            return ok(result.value as T);
        };
    }

    /** Creates a generic parser using Zod validation. */
    private createGenericParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = parseSchema(rawField, input);
            if (result.isErr()) return err(result.error.message);
            return ok(result.value as T);
        };
    }

    /**
     * Gets the internal definition object from a Zod type.
     *
     * Handles both modern Zod v4 (_zod.def) and legacy (_def) structures.
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

    /** Checks if a field is a boolean type (possibly wrapped). */
    private isBooleanField(rawField: z.ZodType): boolean {
        const def = this.getInternalDef(rawField);
        const inner = (def.innerType ?? def.schema) as z.ZodType | undefined;
        return inner instanceof z.ZodBoolean;
    }

    /** Extracts enum choices from a ZodEnum field. */
    private getEnumChoices(field: z.ZodType): readonly string[] {
        const def = this.getInternalDef(field);
        return def.values ?? [];
    }

    /**
     * Compound words that should be treated as single units in kebab-case.
     * These are typically brand names or technical terms that shouldn't be split.
     */
    private readonly compoundWords = ["GitHub", "GitLab", "BitBucket"];

    /**
     * Converts a camelCase string to kebab-case.
     *
     * Handles compound words (e.g., "GitHub", "GitLab") as single units.
     *
     * @example
     * camelToKebab("bumpStrategy") // "bump-strategy"
     * camelToKebab("skipGitHubRelease") // "skip-github-release"
     */
    private camelToKebab(str: string): string {
        let result = str;
        for (const word of this.compoundWords) {
            // Insert hyphen before compound word when preceded by lowercase letter
            result = result.replace(new RegExp(`([a-z])${word}`, "g"), `$1-${word.toLowerCase()}`);
            // Handle compound word at start of string
            result = result.replace(new RegExp(`^${word}`, "g"), word.toLowerCase());
        }
        return result.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
}
