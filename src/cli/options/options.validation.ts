import { InvalidArgumentError } from "commander";
import z from "zod";

/**
 * Internal type for Zod definition with enum values.
 */
interface ZodDefWithValues {
    values?: readonly string[];
    entries?: Record<string, string>;
    options?: unknown[];
    value?: unknown;
    innerType?: z.ZodType;
}

/**
 * Extracts enum values from a Zod schema (handles wrapped types like optional, default).
 *
 * @param schema - The Zod schema to extract enum values from
 * @returns Array of string values if it's an enum, or null if not
 */
export function extractEnumValues(schema: z.ZodType): readonly string[] | null {
    const unwrapped = unwrapZodSchema(schema);

    if (unwrapped instanceof z.ZodEnum) {
        return getEnumValuesFromZodEnum(unwrapped);
    }

    // Handle union types (e.g., z.enum([...]).or(z.literal("")))
    if (unwrapped instanceof z.ZodUnion) {
        const def = getZodDef(unwrapped) as ZodDefWithValues;
        const unionOptions = def.options;
        if (!unionOptions) return null;

        const values: string[] = [];
        for (const option of unionOptions) {
            // Skip if option is not a ZodType (could be a string in some cases)
            if (typeof option === "string") continue;
            const zodOption = option as z.ZodType;

            const innerUnwrapped = unwrapZodSchema(zodOption);
            if (innerUnwrapped instanceof z.ZodEnum) {
                const enumValues = getEnumValuesFromZodEnum(innerUnwrapped);
                if (enumValues) values.push(...enumValues);
            } else if (innerUnwrapped instanceof z.ZodLiteral) {
                const innerDef = getZodDef(innerUnwrapped) as ZodDefWithValues;
                const literalValue = innerDef.value;
                if (typeof literalValue === "string" && literalValue !== "") {
                    values.push(literalValue);
                }
            }
        }
        return values.length > 0 ? values : null;
    }

    return null;
}

/**
 * Extracts enum values from a ZodEnum type.
 * Handles both Zod v4 (options array or entries object) and legacy (values array) structures.
 *
 * @param enumSchema - The ZodEnum schema
 * @returns Array of string values, or null if not found
 */
function getEnumValuesFromZodEnum(enumSchema: z.ZodType): readonly string[] | null {
    // Zod v4: Check for 'options' property directly on the schema
    const schemaAsAny = enumSchema as unknown as { options?: readonly string[] };
    if (Array.isArray(schemaAsAny.options)) {
        return schemaAsAny.options;
    }

    // Check the def for values or entries
    const def = getZodDef(enumSchema) as ZodDefWithValues;

    // Zod v4: entries is an object { key: value }
    if (def.entries && typeof def.entries === "object") {
        return Object.values(def.entries);
    }

    // Legacy: values is an array
    if (def.values && Array.isArray(def.values)) {
        return def.values;
    }

    return null;
}

/**
 * Extracts literal values from a Zod union schema (e.g., z.union([z.literal("0"), z.literal("1")])).
 *
 * @param schema - The Zod schema to extract literal values from
 * @returns Array of literal values if it's a union of literals, or null if not
 */
export function extractLiteralValues(schema: z.ZodType): readonly (string | number)[] | null {
    const unwrapped = unwrapZodSchema(schema);

    if (unwrapped instanceof z.ZodUnion) {
        const def = getZodDef(unwrapped) as ZodDefWithValues;
        const options = def.options;
        if (!options) return null;

        const values: (string | number)[] = [];
        for (const option of options) {
            // Skip if option is not a ZodType
            if (typeof option === "string" || typeof option === "number") continue;
            const zodOption = option as z.ZodType;

            const innerUnwrapped = unwrapZodSchema(zodOption);
            if (innerUnwrapped instanceof z.ZodLiteral) {
                const innerDef = getZodDef(innerUnwrapped) as ZodDefWithValues;
                const value = innerDef.value;
                if (typeof value === "string" || typeof value === "number") {
                    values.push(value);
                }
            }
        }
        return values.length > 0 ? values : null;
    }

    return null;
}

/**
 * Creates a CLI option validator for enum fields.
 *
 * Commander.js requires throwing InvalidArgumentError for validation errors.
 * This is a boundary where exceptions are appropriate for the CLI framework.
 *
 * @param schema - The Zod schema for validation
 * @param optionName - The CLI option name (for error messages)
 * @param choices - The valid enum choices
 * @returns A parser function that throws InvalidArgumentError on failure
 */
export function createEnumValidator<T>(
    schema: z.ZodType,
    optionName: string,
    choices: readonly string[]
): (input: string) => T {
    return (input: string) => {
        const result = schema.safeParse(input);
        if (!result.success) {
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(
                `Invalid value for --${optionName}: "${input}". Must be one of: ${choices.join(", ")}`
            );
        }
        return result.data as T;
    };
}

/**
 * Creates a CLI option validator for number fields.
 *
 * Commander.js requires throwing InvalidArgumentError for validation errors.
 * This is a boundary where exceptions are appropriate for the CLI framework.
 *
 * @param schema - The Zod schema for validation
 * @param optionName - The CLI option name (for error messages)
 * @returns A parser function that throws InvalidArgumentError on failure
 */
export function createNumberValidator<T>(schema: z.ZodType, optionName: string): (input: string) => T {
    return (input: string) => {
        const num = Number(input);
        if (Number.isNaN(num)) {
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(`Invalid number for --${optionName}: "${input}". Expected a valid number.`);
        }

        const result = schema.safeParse(num);
        if (!result.success) {
            const errorMsg = formatZodErrorMessage(result.error);
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(`Invalid value for --${optionName}: "${input}". ${errorMsg}`);
        }
        return result.data as T;
    };
}

/**
 * Creates a CLI option validator for string fields.
 *
 * Commander.js requires throwing InvalidArgumentError for validation errors.
 * This is a boundary where exceptions are appropriate for the CLI framework.
 *
 * @param schema - The Zod schema for validation
 * @param optionName - The CLI option name (for error messages)
 * @returns A parser function that throws InvalidArgumentError on failure
 */
export function createStringValidator<T>(schema: z.ZodType, optionName: string): (input: string) => T {
    return (input: string) => {
        const result = schema.safeParse(input);
        if (!result.success) {
            const errorMsg = formatZodErrorMessage(result.error);
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(`Invalid value for --${optionName}: "${input}". ${errorMsg}`);
        }
        return result.data as T;
    };
}

/**
 * Creates a CLI option validator for union types with literal values.
 *
 * Commander.js requires throwing InvalidArgumentError for validation errors.
 * This is a boundary where exceptions are appropriate for the CLI framework.
 *
 * @param schema - The Zod schema for validation
 * @param optionName - The CLI option name (for error messages)
 * @param values - The valid literal values
 * @returns A parser function that throws InvalidArgumentError on failure
 */
export function createLiteralUnionValidator<T>(
    schema: z.ZodType,
    optionName: string,
    values: readonly (string | number)[]
): (input: string) => T {
    return (input: string) => {
        // For numeric literals, try parsing as number first
        const numericValues = values.filter((v) => typeof v === "number");

        let parsedInput: string | number = input;

        // If we have numeric values, try to parse the input as a number
        if (numericValues.length > 0 && !Number.isNaN(Number(input))) {
            parsedInput = Number(input);
        }

        const result = schema.safeParse(parsedInput);
        if (!result.success) {
            const displayValues = values.map((v) => (typeof v === "string" ? `"${v}"` : String(v)));
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(
                `Invalid value for --${optionName}: "${input}". Must be one of: ${displayValues.join(", ")}`
            );
        }
        return result.data as T;
    };
}

/**
 * Creates a generic CLI option validator.
 *
 * Commander.js requires throwing InvalidArgumentError for validation errors.
 * This is a boundary where exceptions are appropriate for the CLI framework.
 *
 * @param schema - The Zod schema for validation
 * @param optionName - The CLI option name (for error messages)
 * @returns A parser function that throws InvalidArgumentError on failure
 */
export function createGenericValidator<T>(schema: z.ZodType, optionName: string): (input: string) => T {
    return (input: string) => {
        const result = schema.safeParse(input);
        if (!result.success) {
            const errorMsg = formatZodErrorMessage(result.error);
            // biome-ignore lint: Commander.js requires throwing InvalidArgumentError for CLI validation
            throw new InvalidArgumentError(`Invalid value for --${optionName}: "${input}". ${errorMsg}`);
        }
        return result.data as T;
    };
}

/**
 * Formats a Zod error into a user-friendly message.
 *
 * @param error - The Zod error object
 * @returns A formatted error message
 */
function formatZodErrorMessage(error: z.ZodError): string {
    const firstIssue = error.issues[0];
    if (!firstIssue) return "Validation failed.";

    // Handle specific error codes for better messages (Zod v4 compatible)
    switch (firstIssue.code) {
        case "invalid_value": {
            // In Zod v4, enum validation errors use "invalid_value"
            const issue = firstIssue as { values?: readonly string[] };
            if (issue.values) {
                return `Expected one of: ${issue.values.join(", ")}`;
            }
            return firstIssue.message;
        }
        case "invalid_type":
            return `Expected ${firstIssue.expected}`;
        case "too_small":
        case "too_big":
            return firstIssue.message;
        default:
            return firstIssue.message;
    }
}

/**
 * Gets the internal definition object from a Zod type.
 * Handles both modern Zod v4 (_zod.def) and legacy (_def) structures.
 *
 * @param field - The Zod type to get the definition from
 * @returns The internal definition object
 */
function getZodDef(field: z.ZodType): Record<string, unknown> {
    const zodContainer = (field as unknown as { _zod?: { def?: unknown } })._zod;
    if (zodContainer?.def) {
        return zodContainer.def as Record<string, unknown>;
    }

    const legacy = (field as unknown as { _def?: unknown })._def;
    return (legacy ?? {}) as Record<string, unknown>;
}

/**
 * Unwraps Zod wrapper types (optional, default, etc.) to get the inner type.
 *
 * @param field - The Zod type to unwrap
 * @returns The unwrapped inner type
 */
function unwrapZodSchema(field: z.ZodType): z.ZodType {
    const def = getZodDef(field);

    if (field instanceof z.ZodDefault) {
        const inner = def.innerType as z.ZodType | undefined;
        return inner ? unwrapZodSchema(inner) : field;
    }

    if (field instanceof z.ZodOptional) {
        const inner = def.innerType as z.ZodType | undefined;
        return inner ? unwrapZodSchema(inner) : field;
    }

    if (field instanceof z.ZodNullable) {
        const inner = def.innerType as z.ZodType | undefined;
        return inner ? unwrapZodSchema(inner) : field;
    }

    return field;
}
