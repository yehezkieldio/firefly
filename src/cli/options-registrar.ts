import type { Command } from "commander";
import { err, ok, type Result } from "neverthrow";
import z, { type ZodObject, type ZodRawShape } from "zod";
import { parseSchema } from "#/utils/result";

type ValidationResult<T> = Result<T, string>;

type OptionContext = {
    command: Command;
    key: string;
    rawField: z.ZodType;
    field: z.ZodType;
    optionFlag: string;
    optionName: string;
    description: string;
    parsedDefault: unknown;
};

export class OptionsRegistrar {
    private readonly shorthandMap = new Map<string, string>([
        ["bumpStrategy", "bt"],
        ["releaseType", "rt"],
    ]);

    private readonly skipFields = new Set(["dryRun", "verbose", "enableRollback"]);

    registerGlobalOptions(program: Command): void {
        program
            .option("--dry-run", "Run without making actual changes")
            .option("--verbose", "Enable verbose logging")
            .option("--no-enable-rollback", "Disable automatic rollback on failure");
    }

    registerCommandOptions<T extends ZodRawShape>(command: Command, schema: ZodObject<T>): void {
        for (const [key, rawField] of Object.entries(schema.shape)) {
            if (!rawField || this.skipFields.has(key)) continue;

            const ctx = this.buildOptionContext(command, key, rawField as z.ZodType);
            if (ctx) this.registerOption(ctx);
        }
    }

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

    private extractDefaultValue(key: string, rawField: z.ZodType): unknown {
        const single = z.object({ [key]: rawField }).partial();
        const parseResult = single.safeParse({});
        return parseResult.success ? (parseResult.data as Record<string, unknown>)[key] : undefined;
    }

    private registerOption(ctx: OptionContext): void {
        const { command, rawField, field, optionFlag, optionName, description, parsedDefault } = ctx;

        if (this.isBooleanField(rawField)) {
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

    private registerGenericOption(ctx: OptionContext): void {
        const { command, rawField, optionFlag, optionName, description, parsedDefault } = ctx;
        const parser = this.createGenericParser(rawField);
        const wrappedParser = this.wrapParser(parser);
        command.option(`${optionFlag} <${optionName}>`, description, wrappedParser, parsedDefault);
    }

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

    private createStringParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = parseSchema(rawField, input);
            if (result.isErr()) return err(result.error.message);
            return ok(result.value as T);
        };
    }

    private createGenericParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = parseSchema(rawField, input);
            if (result.isErr()) return err(result.error.message);
            return ok(result.value as T);
        };
    }

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

    private isBooleanField(rawField: z.ZodType): boolean {
        const def = this.getInternalDef(rawField);
        const inner = (def.innerType ?? def.schema) as z.ZodType | undefined;
        return inner instanceof z.ZodBoolean;
    }

    private getEnumChoices(field: z.ZodType): readonly string[] {
        const def = this.getInternalDef(field);
        return def.values ?? [];
    }

    private camelToKebab(str: string): string {
        return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
}
