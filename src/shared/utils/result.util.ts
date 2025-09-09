import { type Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";
import { type FireflyError, createFireflyError, toFireflyError } from "#/shared/utils/error.util";

/**
 * - Represents `Result<T, FireflyError>`.
 * - Can be wrapped in a `Promise<FireflyResult<T>>` when internally unwrapping a `FireflyAsyncResult<T>`.
 */
export type FireflyResult<T> = Result<T, FireflyError>;

/**
 * - Represents `ResultAsync<T, FireflyError>`.
 * - **Do not** wrap in another `Promise`.
 * - **Do not** mark functions returning this type as `async`.
 */
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;

export function wrapPromise<T>(promise: Promise<T>): FireflyAsyncResult<T> {
    return ResultAsync.fromPromise(promise, (e) => createFireflyError(toFireflyError(e)));
}

type NonEmptyArray<T> = readonly [T, ...T[]];

type EffectsDescriptor = {
    mode: "effect";
    schemas: NonEmptyArray<z.ZodType<unknown>>;
};

type ShapeDescriptor<TBase extends z.ZodObject<z.ZodRawShape>> = {
    mode: "shape";
    base: TBase;
    shapes: readonly z.ZodRawShape[];
};

type SchemaInput<TSchema extends z.ZodType<unknown>> =
    | TSchema
    | EffectsDescriptor
    | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;

/**
 * Intersect N schemas; preserves all refinements/effects.
 */
export function composeEffects<T extends NonEmptyArray<z.ZodType<unknown>>>(...schemas: T) {
    return schemas.slice(1).reduce((acc, s) => z.intersection(acc, s), schemas[0]);
}

/**
 * Extend a base object schema with raw shapes; drops effects by design.
 */
export function composeShape<TBase extends z.ZodObject<z.ZodRawShape>>(
    base: TBase,
    ...shapes: readonly z.ZodRawShape[]
) {
    const merged: z.ZodRawShape = {};
    for (const s of shapes) Object.assign(merged, s);
    return base.extend(merged);
}

function toSchema<TSchema extends z.ZodType<unknown>>(input: SchemaInput<TSchema>): z.ZodType<unknown> {
    if (typeof (input as { _def?: unknown })?._def !== "undefined") {
        return input as z.ZodType<unknown>;
    }
    const desc = input as EffectsDescriptor | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;
    if (desc.mode === "effect") return composeEffects(...desc.schemas);
    return composeShape(desc.base, ...desc.shapes);
}

export function parseSchema<S extends z.ZodType<unknown>>(
    schemaOrDescriptor: S,
    data: unknown,
): FireflyResult<z.infer<S>>;
export function parseSchema<TBase extends z.ZodObject<z.ZodRawShape>>(
    schemaOrDescriptor: ShapeDescriptor<TBase>,
    data: unknown,
): FireflyResult<z.infer<ReturnType<typeof composeShape<TBase>>>>;
export function parseSchema(schemaOrDescriptor: EffectsDescriptor, data: unknown): FireflyResult<unknown>;

export function parseSchema(
    schemaOrDescriptor: SchemaInput<z.ZodType<unknown>>,
    data: unknown,
): FireflyResult<unknown> {
    const schema = toSchema(schemaOrDescriptor);
    const result = schema.safeParse(data);
    if (result.success) return ok(result.data);
    return err(createFireflyError(toFireflyError(result.error)));
}

export function parseSchemaAsync<S extends z.ZodType<unknown>>(
    schemaOrDescriptor: S,
    data: unknown,
): FireflyAsyncResult<z.infer<S>>;
export function parseSchemaAsync<TBase extends z.ZodObject<z.ZodRawShape>>(
    schemaOrDescriptor: ShapeDescriptor<TBase>,
    data: unknown,
): FireflyAsyncResult<z.infer<ReturnType<typeof composeShape<TBase>>>>;
export function parseSchemaAsync(schemaOrDescriptor: EffectsDescriptor, data: unknown): FireflyAsyncResult<unknown>;

export function parseSchemaAsync(
    schemaOrDescriptor: SchemaInput<z.ZodType<unknown>>,
    data: unknown,
): FireflyAsyncResult<unknown> {
    const schema = toSchema(schemaOrDescriptor);
    return ResultAsync.fromPromise(schema.parseAsync(data), (error) => createFireflyError(toFireflyError(error)));
}
