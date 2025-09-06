import type { Command } from "commander";
import { type Result, err, ok } from "neverthrow";
import { type ZodObject, type ZodRawShape, z } from "zod";

type ValidationResult<T> = Result<T, string>;

export class CLIOptionRegistrar {
    private createNumberParser<T>(rawField: z.ZodType, optionName: string): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const num = Number(input);
            if (Number.isNaN(num)) {
                return err(`Invalid number for --${optionName}: ${input}`);
            }
            const result = rawField.safeParse(num);
            if (!result.success) {
                return err(result.error.message);
            }
            return ok(result.data as T);
        };
    }

    private createEnumParser<T>(
        rawField: z.ZodType,
        optionName: string,
        choices: readonly string[],
    ): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = rawField.safeParse(input);
            if (!result.success) {
                return err(`Invalid value for --${optionName}: ${input}. Allowed: ${choices.join(", ")}`);
            }
            return ok(result.data as T);
        };
    }

    private createStringParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = rawField.safeParse(input);
            if (!result.success) {
                return err(result.error.message);
            }
            return ok(result.data as T);
        };
    }

    private createGenericParser<T>(rawField: z.ZodType): (input: string) => ValidationResult<T> {
        return (input: string) => {
            const result = rawField.safeParse(input);
            if (!result.success) {
                return err(result.error.message);
            }
            return ok(result.data as T);
        };
    }

    private toKebab(s: string): string {
        return s
            .replace(/GitHub/g, "Github") // Handle "GitHub" as a special case first
            .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert dash between lowercase and uppercase
            .toLowerCase()
            .replace(/_/g, "-");
    }

    private getInternalDef(field: z.ZodType): {
        innerType?: z.ZodType;
        schema?: z.ZodType;
        values?: readonly string[];
    } {
        const zodContainer = (field as unknown as { _zod?: { def?: unknown } })._zod;
        if (zodContainer?.def)
            return zodContainer.def as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
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

    registerOptions<T extends ZodRawShape>(cmd: Command, schema: ZodObject<T>): void {
        const shape = schema.shape;

        for (const [key, rawField] of Object.entries(shape)) {
            if (!rawField) continue;

            const field = this.unwrapSchema(rawField as unknown as z.ZodType);
            const optionName = this.toKebab(key);

            const existingOption = cmd.options.find(
                (opt) => opt.long === `--${optionName}` || opt.short === `-${optionName.charAt(0)}`,
            );

            if (existingOption) {
                continue;
            }

            let parsedDefault: unknown;
            const single = z.object({ [key]: rawField }).partial();
            const parseResult = single.safeParse({});
            if (parseResult.success) {
                parsedDefault = (parseResult.data as Record<string, unknown>)[key];
            }

            const description = (rawField as unknown as { description?: string }).description ?? "";

            if (this.isBooleanField(rawField as unknown as z.ZodType)) {
                cmd.option(`--${optionName}`, description);
                continue;
            }

            if (field instanceof z.ZodNumber) {
                const parser = this.createNumberParser(rawField as unknown as z.ZodType, optionName);
                const wrappedParser = (input: string) => {
                    const result = parser(input);
                    if (result.isErr()) {
                        // Commander.js expects synchronous errors, so we need to throw here
                        // biome-ignore lint: This is a boundary where we convert from Result back to exceptions
                        throw new Error(result.error);
                    }
                    return result.value;
                };
                cmd.option(
                    `--${optionName} <${optionName}>`,
                    description,
                    wrappedParser,
                    parsedDefault as number | undefined,
                );
                continue;
            }

            if (field instanceof z.ZodEnum) {
                const choices = this.getEnumChoices(field);
                const parser = this.createEnumParser(rawField as unknown as z.ZodType, optionName, choices);
                const wrappedParser = (input: string) => {
                    const result = parser(input);
                    if (result.isErr()) {
                        // Commander.js expects synchronous errors, so we need to throw here
                        // biome-ignore lint: This is a boundary where we convert from Result back to exceptions
                        throw new Error(result.error);
                    }
                    return result.value;
                };
                cmd.option(
                    `--${optionName} <${optionName}>`,
                    `${description}${choices.length ? ` (choices: ${choices.join(", ")})` : ""}`,
                    wrappedParser,
                    parsedDefault as string | undefined,
                );
                continue;
            }

            if (field instanceof z.ZodString) {
                const parser = this.createStringParser(rawField as unknown as z.ZodType);
                const wrappedParser = (input: string) => {
                    const result = parser(input);
                    if (result.isErr()) {
                        // Commander.js expects synchronous errors, so we need to throw here
                        // biome-ignore lint: This is a boundary where we convert from Result back to exceptions
                        throw new Error(result.error);
                    }
                    return result.value;
                };
                cmd.option(
                    `--${optionName} <${optionName}>`,
                    description,
                    wrappedParser,
                    parsedDefault as string | undefined,
                );
                continue;
            }

            const parser = this.createGenericParser(rawField as unknown as z.ZodType);
            const wrappedParser = (input: string) => {
                const result = parser(input);
                if (result.isErr()) {
                    // Commander.js expects synchronous errors, so we need to throw here
                    // biome-ignore lint: This is a boundary where we convert from Result back to exceptions
                    throw new Error(result.error);
                }
                return result.value;
            };
            cmd.option(`--${optionName} <${optionName}>`, description, wrappedParser, parsedDefault as unknown);
        }
    }
}
