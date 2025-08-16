import { type Command, InvalidArgumentError } from "commander";
import z from "zod";

export function registerOptions<T extends z.ZodRawShape>(cmd: Command, schema: z.ZodObject<T>): void {
    const shape = schema.shape;

    const toKebab = (s: string) =>
        s
            .replace(/GitHub/g, "Github") // Handle "GitHub" as a special case first
            .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert dash between lowercase and uppercase
            .toLowerCase()
            .replace(/_/g, "-");

    const getInternalDef = (
        field: z.ZodType,
    ): { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] } => {
        const zodContainer = (field as unknown as { _zod?: { def?: unknown } })._zod;
        if (zodContainer?.def)
            return zodContainer.def as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
        const legacy = (field as unknown as { _def?: unknown })._def;
        return (legacy ?? {}) as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
    };

    const unwrapSchema = (field: z.ZodType): z.ZodType => {
        if (field instanceof z.ZodDefault) {
            const inner = getInternalDef(field).innerType;
            return inner ? unwrapSchema(inner) : field;
        }

        if (field instanceof z.ZodOptional) {
            const inner = getInternalDef(field).innerType;
            return inner ? unwrapSchema(inner) : field;
        }

        if (field instanceof z.ZodUnknown) {
            const schema = getInternalDef(field).schema;
            return schema ? unwrapSchema(schema) : field;
        }

        return field;
    };

    const isBooleanField = (rawField: z.ZodType): boolean => {
        const def = getInternalDef(rawField);
        const inner = (def.innerType ?? def.schema) as z.ZodType | undefined;
        return inner instanceof z.ZodBoolean;
    };

    const getEnumChoices = (field: z.ZodType): readonly string[] => {
        const def = getInternalDef(field);
        return def.values ?? [];
    };

    for (const [key, rawField] of Object.entries(shape)) {
        if (!rawField) continue;

        const field = unwrapSchema(rawField as unknown as z.ZodType);
        const optionName = toKebab(key);

        let parsedDefault: unknown;
        const single = z.object({ [key]: rawField }).partial();
        const parseResult = single.safeParse({});
        if (parseResult.success) {
            parsedDefault = (parseResult.data as Record<string, unknown>)[key];
        }

        const description = (rawField as unknown as { description?: string }).description ?? "";

        if (isBooleanField(rawField as unknown as z.ZodType)) {
            cmd.option(`--${optionName}`, description);
            continue;
        }

        if (field instanceof z.ZodNumber) {
            const parser = (input: string) => {
                const num = Number(input);
                if (Number.isNaN(num)) throw new InvalidArgumentError(`Invalid number for --${optionName}: ${input}`);
                const result = (rawField as unknown as z.ZodType).safeParse(num);
                if (!result.success) throw new InvalidArgumentError(result.error.message);
                return result.data;
            };
            cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as number | undefined);
            continue;
        }

        if (field instanceof z.ZodEnum) {
            const choices = getEnumChoices(field);
            const parser = (input: string) => {
                const result = (rawField as unknown as z.ZodType).safeParse(input);
                if (!result.success)
                    throw new InvalidArgumentError(
                        `Invalid value for --${optionName}: ${input}. Allowed: ${choices.join(", ")}`,
                    );
                return result.data;
            };
            cmd.option(
                `--${optionName} <${optionName}>`,
                `${description}${choices.length ? ` (choices: ${choices.join(", ")})` : ""}`,
                parser,
                parsedDefault as string | undefined,
            );
            continue;
        }

        if (field instanceof z.ZodString) {
            const parser = (input: string) => {
                const result = (rawField as unknown as z.ZodType).safeParse(input);
                if (!result.success) throw new InvalidArgumentError(result.error.message);
                return result.data;
            };
            cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as string | undefined);
            continue;
        }

        const parser = (input: string) => {
            const result = (rawField as unknown as z.ZodType).safeParse(input);
            if (!result.success) throw new InvalidArgumentError(result.error.message);
            return result.data;
        };
        cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as unknown);
    }
}
