import { err, errAsync, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import z from "zod";
import {
    conflictError,
    createFireflyError,
    type FireflyError,
    failedError,
    invalidError,
    notFoundError,
    timeoutError,
    toFireflyError,
    unexpectedError,
    validationError,
} from "#/utils/error";

// ============================================================================
// Core Result Types
// ============================================================================

export type FireflyResult<T> = Result<T, FireflyError>;
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;

// ============================================================================
// Result Constructors (Ergonomic Aliases)
// ============================================================================

/**
 * Creates a successful sync result.
 *
 * @example
 * ```ts
 * return FireflyOk(computedValue);
 * ```
 */
export const FireflyOk = <T>(value: T): FireflyResult<T> => ok(value);

/**
 * Creates a failed sync result.
 *
 * @example
 * ```ts
 * return FireflyErr(validationError({ message: "Invalid input" }));
 * ```
 */
export const FireflyErr = <T = never>(error: FireflyError): FireflyResult<T> => err(error);

/**
 * Creates a successful async result.
 *
 * @example
 * ```ts
 * return FireflyOkAsync(fetchedData);
 * ```
 */
export const FireflyOkAsync = <T>(value: T): FireflyAsyncResult<T> => okAsync(value);

/**
 * Creates a failed async result.
 *
 * @example
 * ```ts
 * return FireflyErrAsync(notFoundError({ message: "Config not found" }));
 * ```
 */
export const FireflyErrAsync = <T = never>(error: FireflyError): FireflyAsyncResult<T> => errAsync(error);

// ============================================================================
// Convenience Error Result Constructors
// ============================================================================

interface ErrorResultOptions {
    readonly message: string;
    readonly source?: string;
    readonly details?: unknown;
}

/**
 * Creates a sync validation error result.
 *
 * @example
 * ```ts
 * if (!isValid) return validationErr({ message: "Invalid version format" });
 * ```
 */
export const validationErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(validationError(opts));

/**
 * Creates an async validation error result.
 */
export const validationErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(validationError(opts));

/**
 * Creates a sync not-found error result.
 *
 * @example
 * ```ts
 * if (!file) return notFoundErr({ message: "Config file not found" });
 * ```
 */
export const notFoundErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(notFoundError(opts));

/**
 * Creates an async not-found error result.
 */
export const notFoundErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(notFoundError(opts));

/**
 * Creates a sync conflict error result.
 *
 * @example
 * ```ts
 * if (exists) return conflictErr({ message: "Item already exists" });
 * ```
 */
export const conflictErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(conflictError(opts));

/**
 * Creates an async conflict error result.
 */
export const conflictErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(conflictError(opts));

/**
 * Creates a sync failed error result.
 *
 * @example
 * ```ts
 * return failedErr({ message: "Operation failed", details: stderr });
 * ```
 */
export const failedErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(failedError(opts));

/**
 * Creates an async failed error result.
 */
export const failedErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(failedError(opts));

/**
 * Creates a sync invalid error result.
 *
 * @example
 * ```ts
 * if (!taskFn) return invalidErr({ message: "Task must have an execute function" });
 * ```
 */
export const invalidErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(invalidError(opts));

/**
 * Creates an async invalid error result.
 */
export const invalidErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(invalidError(opts));

/**
 * Creates a sync timeout error result.
 *
 * @example
 * ```ts
 * return timeoutErr({ message: "Operation timed out after 30s" });
 * ```
 */
export const timeoutErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(timeoutError(opts));

/**
 * Creates an async timeout error result.
 */
export const timeoutErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(timeoutError(opts));

/**
 * Creates a sync unexpected error result.
 *
 * @example
 * ```ts
 * return unexpectedErr({ message: "Unknown error occurred" });
 * ```
 */
export const unexpectedErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(unexpectedError(opts));

/**
 * Creates an async unexpected error result.
 */
export const unexpectedErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(unexpectedError(opts));

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

// ============================================================================
// Conditional Result Utilities
// ============================================================================

/**
 * Returns an error result if the condition is true, otherwise ok(undefined).
 *
 * @example
 * ```ts
 * return ensureNot(user.isBlocked, {
 *   message: "User is blocked",
 *   source: "auth",
 * }).map(() => user);
 * ```
 */
export function ensureNot(condition: boolean, errorOpts: ErrorResultOptions): FireflyResult<void> {
    return condition ? validationErr(errorOpts) : ok(undefined);
}

/**
 * Async version of ensureNot.
 */
export function ensureNotAsync(condition: boolean, errorOpts: ErrorResultOptions): FireflyAsyncResult<void> {
    return condition ? validationErrAsync(errorOpts) : okAsync(undefined);
}

/**
 * Returns an error result if the condition is false, otherwise ok(undefined).
 *
 * @example
 * ```ts
 * return ensure(isValidFormat, {
 *   message: "Invalid format",
 * }).map(() => processedData);
 * ```
 */
export function ensure(condition: boolean, errorOpts: ErrorResultOptions): FireflyResult<void> {
    return condition ? ok(undefined) : validationErr(errorOpts);
}

/**
 * Async version of ensure.
 */
export function ensureAsync(condition: boolean, errorOpts: ErrorResultOptions): FireflyAsyncResult<void> {
    return condition ? okAsync(undefined) : validationErrAsync(errorOpts);
}

/**
 * Converts a nullable value to a result, returning not-found error if null/undefined.
 *
 * @example
 * ```ts
 * const userResult = fromNullable(maybeUser, { message: "User not found" });
 * ```
 */
export function fromNullable<T>(value: T | null | undefined, errorOpts: ErrorResultOptions): FireflyResult<T> {
    return value != null ? ok(value) : notFoundErr(errorOpts);
}

/**
 * Async version of fromNullable.
 */
export function fromNullableAsync<T>(
    value: T | null | undefined,
    errorOpts: ErrorResultOptions
): FireflyAsyncResult<T> {
    return value != null ? okAsync(value) : notFoundErrAsync(errorOpts);
}

// ============================================================================
// Result Transformation Utilities
// ============================================================================

/**
 * Maps over an array with a function that returns Results, collecting all successes.
 * Short-circuits on first error.
 *
 * @example
 * ```ts
 * const parsed = traverseResults(rawItems, parseItem);
 * ```
 */
export function traverseResults<T, U>(
    items: readonly T[],
    fn: (item: T, index: number) => FireflyResult<U>
): FireflyResult<U[]> {
    const results: U[] = [];

    for (const [index, item] of items.entries()) {
        const result = fn(item, index);
        if (result.isErr()) return err(result.error);
        results.push(result.value);
    }

    return ok(results);
}

/**
 * Async version of traverseResults. Executes sequentially.
 *
 * @example
 * ```ts
 * const fetched = await traverseResultsAsync(ids, fetchItem);
 * ```
 */
export function traverseResultsAsync<T, U>(
    items: readonly T[],
    fn: (item: T, index: number) => FireflyAsyncResult<U>
): FireflyAsyncResult<U[]> {
    return items.reduce<FireflyAsyncResult<U[]>>(
        (acc, item, index) => acc.andThen((results) => fn(item, index).map((value) => [...results, value])),
        okAsync([])
    );
}

/**
 * Async version of traverseResults that executes in parallel.
 *
 * @example
 * ```ts
 * const fetched = await traverseResultsParallel(ids, fetchItem);
 * ```
 */
export function traverseResultsParallel<T, U>(
    items: readonly T[],
    fn: (item: T, index: number) => FireflyAsyncResult<U>
): FireflyAsyncResult<U[]> {
    return collectAsyncResults(items.map((item, index) => fn(item, index)));
}

// ============================================================================
// Result Filtering Utilities
// ============================================================================

/**
 * Filters results, keeping only successful values that pass the predicate.
 *
 * @example
 * ```ts
 * const activeUsers = filterResults(userResults, user => user.isActive);
 * ```
 */
export function filterResults<T>(
    results: readonly FireflyResult<T>[],
    predicate: (value: T) => boolean
): FireflyResult<T[]> {
    const values: T[] = [];

    for (const result of results) {
        if (result.isErr()) return err(result.error);
        if (predicate(result.value)) {
            values.push(result.value);
        }
    }

    return ok(values);
}

/**
 * Partitions results into successes and failures.
 *
 * @example
 * ```ts
 * const { successes, failures } = partitionResults(results);
 * logger.info(`${successes.length} succeeded, ${failures.length} failed`);
 * ```
 */
export function partitionResults<T>(results: readonly FireflyResult<T>[]): {
    successes: T[];
    failures: FireflyError[];
} {
    const successes: T[] = [];
    const failures: FireflyError[] = [];

    for (const result of results) {
        if (result.isOk()) {
            successes.push(result.value);
        } else {
            failures.push(result.error);
        }
    }

    return { successes, failures };
}

// ============================================================================
// Result Chaining Utilities
// ============================================================================

/**
 * Chains multiple operations, passing the result of each to the next.
 * More readable than nested andThen calls.
 *
 * @example
 * ```ts
 * const result = pipe(
 *   initialValue,
 *   (v) => validateInput(v),
 *   (v) => transformData(v),
 *   (v) => saveResult(v),
 * );
 * ```
 */
export function pipe<A, B>(initial: FireflyResult<A>, fn1: (a: A) => FireflyResult<B>): FireflyResult<B>;
export function pipe<A, B, C>(
    initial: FireflyResult<A>,
    fn1: (a: A) => FireflyResult<B>,
    fn2: (b: B) => FireflyResult<C>
): FireflyResult<C>;
export function pipe<A, B, C, D>(
    initial: FireflyResult<A>,
    fn1: (a: A) => FireflyResult<B>,
    fn2: (b: B) => FireflyResult<C>,
    fn3: (c: C) => FireflyResult<D>
): FireflyResult<D>;
export function pipe(
    initial: FireflyResult<unknown>,
    ...fns: Array<(value: unknown) => FireflyResult<unknown>>
): FireflyResult<unknown> {
    return fns.reduce((acc, fn) => acc.andThen(fn), initial);
}

/**
 * Async version of pipe.
 *
 * @example
 * ```ts
 * const result = await pipeAsync(
 *   okAsync(userId),
 *   (id) => fetchUser(id),
 *   (user) => fetchUserPosts(user),
 * );
 * ```
 */
export function pipeAsync<A, B>(
    initial: FireflyAsyncResult<A>,
    fn1: (a: A) => FireflyAsyncResult<B>
): FireflyAsyncResult<B>;
export function pipeAsync<A, B, C>(
    initial: FireflyAsyncResult<A>,
    fn1: (a: A) => FireflyAsyncResult<B>,
    fn2: (b: B) => FireflyAsyncResult<C>
): FireflyAsyncResult<C>;
export function pipeAsync<A, B, C, D>(
    initial: FireflyAsyncResult<A>,
    fn1: (a: A) => FireflyAsyncResult<B>,
    fn2: (b: B) => FireflyAsyncResult<C>,
    fn3: (c: C) => FireflyAsyncResult<D>
): FireflyAsyncResult<D>;
export function pipeAsync(
    initial: FireflyAsyncResult<unknown>,
    ...fns: Array<(value: unknown) => FireflyAsyncResult<unknown>>
): FireflyAsyncResult<unknown> {
    return fns.reduce((acc, fn) => acc.andThen(fn), initial);
}

// ============================================================================
// Result Recovery Utilities
// ============================================================================

/**
 * Provides a fallback value if the result is an error.
 *
 * @example
 * ```ts
 * const config = withDefault(loadConfig(), defaultConfig);
 * ```
 */
export function withDefault<T>(result: FireflyResult<T>, defaultValue: T): T {
    return result.isOk() ? result.value : defaultValue;
}

/**
 * Provides a lazy fallback value if the result is an error.
 *
 * @example
 * ```ts
 * const config = withDefaultLazy(loadConfig(), () => createDefaultConfig());
 * ```
 */
export function withDefaultLazy<T>(result: FireflyResult<T>, getDefault: () => T): T {
    return result.isOk() ? result.value : getDefault();
}

/**
 * Recovers from specific error codes with a fallback.
 *
 * @example
 * ```ts
 * const result = recoverIf(
 *   fetchCachedData(),
 *   ["NOT_FOUND", "TIMEOUT"],
 *   () => fetchFreshData()
 * );
 * ```
 */
export function recoverIf<T>(
    result: FireflyResult<T>,
    codes: readonly FireflyError["code"][],
    recovery: (error: FireflyError) => FireflyResult<T>
): FireflyResult<T> {
    if (result.isOk()) return result;
    if (codes.includes(result.error.code)) return recovery(result.error);
    return result;
}

/**
 * Async version of recoverIf.
 */
export function recoverIfAsync<T>(
    result: FireflyAsyncResult<T>,
    codes: readonly FireflyError["code"][],
    recovery: (error: FireflyError) => FireflyAsyncResult<T>
): FireflyAsyncResult<T> {
    return result.orElse((error) => (codes.includes(error.code) ? recovery(error) : errAsync(error)));
}

// ============================================================================
// Result Combination Utilities
// ============================================================================

/**
 * Combines two results into a tuple.
 *
 * @example
 * ```ts
 * const combined = zip(getUserResult, getSettingsResult);
 * // FireflyResult<[User, Settings]>
 * ```
 */
export function zip<A, B>(resultA: FireflyResult<A>, resultB: FireflyResult<B>): FireflyResult<[A, B]> {
    if (resultA.isErr()) return err(resultA.error);
    if (resultB.isErr()) return err(resultB.error);
    return ok([resultA.value, resultB.value]);
}

/**
 * Combines three results into a tuple.
 */
export function zip3<A, B, C>(
    resultA: FireflyResult<A>,
    resultB: FireflyResult<B>,
    resultC: FireflyResult<C>
): FireflyResult<[A, B, C]> {
    if (resultA.isErr()) return err(resultA.error);
    if (resultB.isErr()) return err(resultB.error);
    if (resultC.isErr()) return err(resultC.error);
    return ok([resultA.value, resultB.value, resultC.value]);
}

/**
 * Async version of zip.
 */
export function zipAsync<A, B>(
    resultA: FireflyAsyncResult<A>,
    resultB: FireflyAsyncResult<B>
): FireflyAsyncResult<[A, B]> {
    return ResultAsync.combine([resultA, resultB]) as FireflyAsyncResult<[A, B]>;
}

/**
 * Async version of zip3.
 */
export function zip3Async<A, B, C>(
    resultA: FireflyAsyncResult<A>,
    resultB: FireflyAsyncResult<B>,
    resultC: FireflyAsyncResult<C>
): FireflyAsyncResult<[A, B, C]> {
    return ResultAsync.combine([resultA, resultB, resultC]) as FireflyAsyncResult<[A, B, C]>;
}

// ============================================================================
// Result Inspection Utilities
// ============================================================================

/**
 * Executes a side effect on the success value without modifying the result.
 *
 * @example
 * ```ts
 * return tap(result, (value) => logger.info(`Got value: ${value}`));
 * ```
 */
export function tap<T>(result: FireflyResult<T>, fn: (value: T) => void): FireflyResult<T> {
    if (result.isOk()) fn(result.value);
    return result;
}

/**
 * Executes a side effect on the error without modifying the result.
 *
 * @example
 * ```ts
 * return tapError(result, (error) => logger.error(`Failed: ${error.message}`));
 * ```
 */
export function tapError<T>(result: FireflyResult<T>, fn: (error: FireflyError) => void): FireflyResult<T> {
    if (result.isErr()) fn(result.error);
    return result;
}

/**
 * Async version of tap.
 */
export function tapAsync<T>(
    result: FireflyAsyncResult<T>,
    fn: (value: T) => void | Promise<void>
): FireflyAsyncResult<T> {
    return result.map((value) => {
        fn(value);
        return value;
    });
}

/**
 * Async version of tapError.
 */
export function tapErrorAsync<T>(
    result: FireflyAsyncResult<T>,
    fn: (error: FireflyError) => void | Promise<void>
): FireflyAsyncResult<T> {
    return result.mapErr((error) => {
        fn(error);
        return error;
    });
}
