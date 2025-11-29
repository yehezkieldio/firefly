import { err, ok, type Result, ResultAsync } from "neverthrow";
import z from "zod";
import { createFireflyError, type FireflyError, toFireflyError } from "#/utils/error";

// ============================================================================
// Core Result Types
// ============================================================================

export type FireflyResult<T> = Result<T, FireflyError>;
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;

// ============================================================================
// Promise Wrapping Utilities
// ============================================================================

export function wrapPromise<T>(promise: Promise<T>): FireflyAsyncResult<T> {
    return ResultAsync.fromPromise(promise, (e) => createFireflyError(toFireflyError(e)));
}

// ============================================================================
// Schema Composition Types
// ============================================================================

type NonEmptyArray<T> = readonly [T, ...T[]];

interface EffectsDescriptor {
    readonly mode: "effect";
    readonly schemas: NonEmptyArray<z.ZodType<unknown>>;
}

interface ShapeDescriptor<TBase extends z.ZodObject<z.ZodRawShape>> {
    readonly mode: "shape";
    readonly base: TBase;
    readonly shapes: readonly z.ZodRawShape[];
}

type SchemaInput<TSchema extends z.ZodType<unknown>> =
    | TSchema
    | EffectsDescriptor
    | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;

// ============================================================================
// Schema Composition Functions
// ============================================================================

export function composeEffects<T extends NonEmptyArray<z.ZodType<unknown>>>(...schemas: T) {
    return schemas.slice(1).reduce((acc, s) => z.intersection(acc, s), schemas[0]);
}

export function composeShape<TBase extends z.ZodObject<z.ZodRawShape>>(
    base: TBase,
    ...shapes: readonly z.ZodRawShape[]
) {
    const merged: z.ZodRawShape = {};
    for (const s of shapes) Object.assign(merged, s);
    return base.extend(merged);
}

function toSchema<TSchema extends z.ZodType<unknown>>(input: SchemaInput<TSchema>): z.ZodType<unknown> {
    // Type guard: check if it's a Zod schema (has _def property)
    if ("_def" in input && typeof (input as { _def?: unknown })._def !== "undefined") {
        return input as z.ZodType<unknown>;
    }

    const desc = input as EffectsDescriptor | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;

    return desc.mode === "effect" ? composeEffects(...desc.schemas) : composeShape(desc.base, ...desc.shapes);
}

// ============================================================================
// Schema Parsing Functions
// ============================================================================

export function parseSchema<S extends z.ZodType<unknown>>(
    schemaOrDescriptor: S,
    data: unknown
): FireflyResult<z.infer<S>>;
export function parseSchema<TBase extends z.ZodObject<z.ZodRawShape>>(
    schemaOrDescriptor: ShapeDescriptor<TBase>,
    data: unknown
): FireflyResult<z.infer<ReturnType<typeof composeShape<TBase>>>>;
export function parseSchema(schemaOrDescriptor: EffectsDescriptor, data: unknown): FireflyResult<unknown>;

export function parseSchema(
    schemaOrDescriptor: SchemaInput<z.ZodType<unknown>>,
    data: unknown
): FireflyResult<unknown> {
    const schema = toSchema(schemaOrDescriptor);
    const result = schema.safeParse(data);

    return result.success ? ok(result.data) : err(createFireflyError(toFireflyError(result.error)));
}

export function parseSchemaAsync<S extends z.ZodType<unknown>>(
    schemaOrDescriptor: S,
    data: unknown
): FireflyAsyncResult<z.infer<S>>;
export function parseSchemaAsync<TBase extends z.ZodObject<z.ZodRawShape>>(
    schemaOrDescriptor: ShapeDescriptor<TBase>,
    data: unknown
): FireflyAsyncResult<z.infer<ReturnType<typeof composeShape<TBase>>>>;
export function parseSchemaAsync(schemaOrDescriptor: EffectsDescriptor, data: unknown): FireflyAsyncResult<unknown>;

export function parseSchemaAsync(
    schemaOrDescriptor: SchemaInput<z.ZodType<unknown>>,
    data: unknown
): FireflyAsyncResult<unknown> {
    const schema = toSchema(schemaOrDescriptor);
    return ResultAsync.fromPromise(schema.parseAsync(data), (error) => createFireflyError(toFireflyError(error)));
}

// ============================================================================
// Result Utility Functions
// ============================================================================

/**
 * Collects multiple FireflyResults into a single result containing an array.
 * Short-circuits on first error.
 *
 * @param results - Array of results to collect
 * @returns Combined result with all values or first error
 */
export function collectResults<T>(results: readonly FireflyResult<T>[]): FireflyResult<T[]> {
    const values: T[] = [];

    for (const result of results) {
        if (result.isErr()) return err(result.error);
        values.push(result.value);
    }

    return ok(values);
}

/**
 * Collects multiple FireflyAsyncResults into a single result containing an array.
 * Executes in parallel and collects all errors.
 *
 * @param results - Array of async results to collect
 * @returns Combined result with all values or first error
 */
export function collectAsyncResults<T>(results: readonly FireflyAsyncResult<T>[]): FireflyAsyncResult<T[]> {
    return ResultAsync.combine(results as FireflyAsyncResult<T>[]);
}
