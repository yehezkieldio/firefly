import { ResultAsync } from "neverthrow";
import z from "zod";
import { createFireflyError, toFireflyError } from "#/core/result/error.factories";
import { FireflyErr, FireflyOk } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";

/**
 * A tuple type that ensures the array has at least one element.
 */
type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Descriptor used when composing Zod schemas with intersection semantics.
 * `schemas` must be a non-empty array of Zod schemas to intersect.
 */
interface EffectsDescriptor {
    readonly mode: "effect";
    readonly schemas: NonEmptyArray<z.ZodType<unknown>>;
}

/**
 * Descriptor used to merge raw Zod object shapes into a base Zod object.
 * `base` is the root object schema which will be extended by merging
 * each `shapes` object into a single consolidated shape.
 */
interface ShapeDescriptor<TBase extends z.ZodObject<z.ZodRawShape>> {
    readonly mode: "shape";
    readonly base: TBase;
    readonly shapes: readonly z.ZodRawShape[];
}

/**
 * A union representing the various accepted inputs for schema composition
 * helpers — either a plain Zod schema, an effects (intersection) descriptor,
 * or a shape (object extend) descriptor.
 */
type SchemaInput<TSchema extends z.ZodType<unknown>> =
    | TSchema
    | EffectsDescriptor
    | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;

/**
 * Compose multiple Zod schemas using intersection semantics.
 * The first schema is used as the base and all remaining schemas are intersected
 * with it. This effectively merges validation rules across schemas.
 *
 * @param schemas - A non-empty list of Zod schemas to intersect.
 * @returns A Zod schema that is the intersection of the provided schemas.
 */
export function composeEffects<T extends NonEmptyArray<z.ZodType<unknown>>>(...schemas: T) {
    return schemas.slice(1).reduce((acc, s) => z.intersection(acc, s), schemas[0]);
}

/**
 * Merge raw object shapes into a base Zod object schema and return an extended
 * object schema.
 *
 * @param base - The root Zod object schema to extend.
 * @param shapes - Raw Zod shapes (plain objects of Zod schema definitions) to merge into the base.
 * @returns A new Zod object schema that extends `base` with merged `shapes`.
 */
export function composeShape<TBase extends z.ZodObject<z.ZodRawShape>>(
    base: TBase,
    ...shapes: readonly z.ZodRawShape[]
) {
    const merged: z.ZodRawShape = {};
    for (const s of shapes) Object.assign(merged, s);
    return base.extend(merged);
}

/**
 * Convert a `SchemaInput` descriptor into a Zod schema instance.
 * If the input is already a Zod schema it is returned verbatim. If a descriptor
 * is supplied, the appropriate composition helper is invoked to produce a
 * schema instance.
 *
 * @internal
 * @param input - Either a Zod schema or a descriptor describing how to compose one.
 * @returns A concrete `z.ZodType` instance resulting from the input.
 */
function toSchema<TSchema extends z.ZodType<unknown>>(input: SchemaInput<TSchema>): z.ZodType<unknown> {
    // Type guard: check if it's a Zod schema (has _def property)
    if ("_def" in input && typeof (input as { _def?: unknown })._def !== "undefined") {
        return input as z.ZodType<unknown>;
    }

    const desc = input as EffectsDescriptor | ShapeDescriptor<z.ZodObject<z.ZodRawShape>>;

    return desc.mode === "effect" ? composeEffects(...desc.schemas) : composeShape(desc.base, ...desc.shapes);
}

/**
 * Synchronous schema parsing utility.
 * Accepts either a raw Zod schema, a shape descriptor, or an effects descriptor.
 * The input is validated using `safeParse` and returned wrapped in a Firefly-style
 * synchronous `FireflyResult` which is `FireflyOk` on success or `FireflyErr` on failure.
 *
 * Overloads are provided so callers keep accurate inferred types for the return value.
 *
 * @param schemaOrDescriptor - A Zod schema or a descriptor describing how to compose one.
 * @param data - The value to validate against the schema.
 * @returns `FireflyOk` with parsed data on success, `FireflyErr` with a FireflyError on failure.
 */
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

    return result.success ? FireflyOk(result.data) : FireflyErr(createFireflyError(toFireflyError(result.error)));
}

/**
 * Asynchronous schema parsing utility.
 * Accepts a Zod schema or descriptors and validates asynchronously using
 * `schema.parseAsync`. Results are returned as a `FireflyAsyncResult`.
 *
 * Overloads preserve precise inferred return types.
 *
 * @param schemaOrDescriptor - A Zod schema or a descriptor describing how to compose one.
 * @param data - The value to validate.
 * @returns `ResultAsync` which resolves to `FireflyOk` with parsed data on success, or `FireflyErr` on error.
 */
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
