import { ResultAsync } from "neverthrow";
import type z from "zod";
import {
    type FireflyError,
    type FireflyErrorCode,
    createFireflyError,
    toFireflyError,
} from "#/shared/utils/error.util";
import { aggregateErrors, isRetryable, withErrorContext } from "#/shared/utils/error-factory.util";
import {
    type FireflyAsyncResult,
    type FireflyResult,
    fireflyErr,
    fireflyOk,
    fireflyOkAsync,
} from "#/shared/utils/result.util";

/**
 * Wraps a Promise in a FireflyAsyncResult.
 */
export const fromPromise = <T>(
    p: Promise<T>,
    code: FireflyErrorCode,
    source?: FireflyError["source"],
): FireflyAsyncResult<T> => ResultAsync.fromPromise(p, (e) => toFireflyError(e, code, source));

/**
 * Adds context to the error inside a FireflyResult without breaking the chain.
 */
export const withContext = <T>(result: FireflyResult<T>, context: string): FireflyResult<T> =>
    result.mapErr((err) => withErrorContext(err, context));

/**
 * Async version of withContext.
 */
export const withContextAsync = <T>(result: FireflyAsyncResult<T>, context: string): FireflyAsyncResult<T> =>
    result.mapErr((err) => withErrorContext(err, context));

/**
 * Validates input using a Zod schema with full type inference.
 * Avoids repeating the schema type parameter.
 */
export function validateWithResult<TSchema extends z.ZodType>(
    schema: TSchema,
    data: unknown,
    fieldName?: string,
): FireflyResult<z.infer<TSchema>> {
    const result = schema.safeParse(data);
    if (result.success) {
        return fireflyOk(result.data);
    }

    return fireflyErr(
        createFireflyError({
            code: "VALIDATION",
            message: result.error.message,
            details: result.error.issues || undefined,
            source: fieldName ? "application" : undefined,
        }),
    );
}

/**
 * Creates a pipeline of transformations that can fail at any step.
 * Each transformation's output type becomes the next transformation's input type.
 */
export function pipe<
    TInitial,
    TSteps extends readonly [
        (input: TInitial) => FireflyResult<unknown>,
        ...((input: unknown) => FireflyResult<unknown>)[],
    ],
>(
    value: TInitial,
    ...transformations: TSteps
): FireflyResult<
    TSteps extends readonly [...infer _, (input: unknown) => FireflyResult<infer TLastOut>] ? TLastOut : TInitial
> {
    const intermediate = transformations.reduce(
        (acc, transform) => acc.andThen(transform as (input: unknown) => FireflyResult<unknown>),
        fireflyOk(value) as FireflyResult<unknown>,
    );

    return intermediate as FireflyResult<
        TSteps extends readonly [...infer _, (input: unknown) => FireflyResult<infer TLastOut>] ? TLastOut : TInitial
    >;
}

/**
 * Async version of pipe.
 */
export function pipeAsync<
    TInitial,
    TSteps extends readonly [
        (input: TInitial) => FireflyAsyncResult<unknown>,
        ...((input: unknown) => FireflyAsyncResult<unknown>)[],
    ],
>(
    value: TInitial,
    ...transformations: TSteps
): FireflyAsyncResult<
    TSteps extends readonly [...infer _, (input: unknown) => FireflyAsyncResult<infer TLastOut>] ? TLastOut : TInitial
> {
    const intermediate = transformations.reduce(
        (acc, transform) => acc.andThen(transform as (input: unknown) => FireflyAsyncResult<unknown>),
        fireflyOkAsync(value) as FireflyAsyncResult<unknown>,
    );

    return intermediate as FireflyAsyncResult<
        TSteps extends readonly [...infer _, (input: unknown) => FireflyAsyncResult<infer TLastOut>]
            ? TLastOut
            : TInitial
    >;
}

/**
 * Combines multiple Results into a single Result containing an array.
 * If any Result is an error, returns the first error encountered.
 */
export function combine<T>(results: FireflyResult<T>[]): FireflyResult<T[]> {
    const values: T[] = [];

    for (const result of results) {
        if (result.isErr()) {
            return fireflyErr(result.error);
        }
        values.push(result.value);
    }

    return fireflyOk(values);
}

/**
 * Combines multiple Results, collecting all errors if any fail.
 */
export function combineWithAllErrors<T>(results: FireflyResult<T>[]): FireflyResult<T[]> {
    const values: T[] = [];
    const errors: FireflyError[] = [];

    for (const result of results) {
        if (result.isErr()) {
            errors.push(result.error);
        } else {
            values.push(result.value);
        }
    }

    if (errors.length > 0) {
        return fireflyErr(aggregateErrors(errors));
    }

    return fireflyOk(values);
}

/**
 * Async version of combine.
 */
export function combineAsync<T>(results: FireflyAsyncResult<T>[]): FireflyAsyncResult<T[]> {
    return ResultAsync.combine(results) as FireflyAsyncResult<T[]>;
}

/**
 * Maps over an array with a function that returns a Result.
 * Short-circuits on first error.
 */
export function traverse<T, U>(items: T[], fn: (item: T, index: number) => FireflyResult<U>): FireflyResult<U[]> {
    const results: U[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item === undefined) continue;

        const result = fn(item, i);
        if (result.isErr()) {
            return fireflyErr(result.error);
        }
        results.push(result.value);
    }

    return fireflyOk(results);
}

/**
 * Async version of traverse.
 */
export function traverseAsync<T, U>(
    items: T[],
    fn: (item: T, index: number) => FireflyAsyncResult<U>,
): FireflyAsyncResult<U[]> {
    const promises = items.map((item, index) => fn(item, index));
    return combineAsync(promises);
}

/**
 * Provides a default value if the Result is an error.
 */
export function withDefault<T>(result: FireflyResult<T>, defaultValue: T): T {
    return result.isOk() ? result.value : defaultValue;
}

/**
 * Provides a default value based on the error if the Result is an error.
 */
export function withDefaultFn<T>(result: FireflyResult<T>, defaultFn: (error: FireflyError) => T): T {
    return result.isOk() ? result.value : defaultFn(result.error);
}

/**
 * Filters a value through a predicate, returning an error if it doesn't match.
 */
export function filter<T>(value: T, predicate: (value: T) => boolean, errorMessage: string): FireflyResult<T> {
    if (predicate(value)) {
        return fireflyOk(value);
    }
    return fireflyErr(
        createFireflyError({
            code: "VALIDATION",
            message: errorMessage,
            details: { value },
            source: "application",
        }),
    );
}

/**
 * Ensures a value is not null or undefined.
 */
export function ensureDefined<T>(value: T | null | undefined, errorMessage: string): FireflyResult<T> {
    if (value !== null && value !== undefined) {
        return fireflyOk(value);
    }
    return fireflyErr(
        createFireflyError({
            code: "NOT_FOUND",
            message: errorMessage,
            source: "application",
        }),
    );
}

/**
 * Retries an async operation with exponential backoff.
 */
export function retryWithBackoff<T>(
    operation: () => FireflyAsyncResult<T>,
    options: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffFactor?: number;
        shouldRetry?: (error: FireflyError, attempt: number) => boolean;
    } = {},
): FireflyAsyncResult<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 100,
        maxDelayMs = 5000,
        backoffFactor = 2,
        shouldRetry = isRetryable,
    } = options;

    let delayMs = initialDelayMs;

    return ResultAsync.fromSafePromise(
        (async (): Promise<FireflyResult<T>> => {
            let lastError: FireflyError | undefined;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const result = await operation();

                if (result.isOk()) {
                    return fireflyOk(result.value);
                }

                lastError = result.error;

                if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
                    return fireflyErr(withErrorContext(lastError, `Failed after ${attempt} attempt(s)`));
                }

                await new Promise((resolve) => setTimeout(resolve, delayMs));
                delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
            }

            return fireflyErr(
                lastError ??
                    createFireflyError({
                        code: "UNEXPECTED",
                        message: "Retry failed with no error",
                        source: "application",
                    }),
            );
        })(),
    ).andThen((res) => res); // flatten nested Result
}

/**
 * Converts a Result to a Promise that resolves on Ok or rejects on Err.
 */
export function toPromise<T>(result: FireflyResult<T>): Promise<T> {
    if (result.isOk()) {
        return Promise.resolve(result.value);
    }
    return Promise.reject(result.error);
}

/**
 * Converts an AsyncResult to a Promise that resolves on Ok or rejects on Err.
 */
export async function toPromiseAsync<T>(result: FireflyAsyncResult<T>): Promise<T> {
    const awaited = await result;
    if (awaited.isOk()) {
        return awaited.value;
    }
    throw awaited.error;
}

/**
 * Chains multiple async operations, passing the result of each to the next.
 * Similar to pipe but for async operations that need to be awaited.
 */
export async function sequence<T>(
    initial: T,
    ...operations: Array<(prev: T) => FireflyAsyncResult<T>>
): Promise<FireflyResult<T>> {
    let current: T = initial;

    for (const operation of operations) {
        const result = await operation(current);
        if (result.isErr()) {
            return fireflyErr(result.error);
        }
        current = result.value;
    }

    return fireflyOk(current);
}

/**
 * Partitions an array of Results into successes and failures.
 */
export function partition<T>(results: FireflyResult<T>[]): { successes: T[]; failures: FireflyError[] } {
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

/**
 * Maps a Result to a different type, with separate mappers for Ok and Err cases.
 */
export function fold<T, U>(result: FireflyResult<T>, onOk: (value: T) => U, onErr: (error: FireflyError) => U): U {
    return result.isOk() ? onOk(result.value) : onErr(result.error);
}

/**
 * Async version of fold.
 */
export async function foldAsync<T, U>(
    result: FireflyAsyncResult<T>,
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: FireflyError) => U | Promise<U>,
): Promise<U> {
    return result.match(onOk, onErr);
}

/**
 * Flattens a nested Result.
 */
export function flatten<T>(result: FireflyResult<FireflyResult<T>>): FireflyResult<T> {
    return result.andThen((inner) => inner);
}

/**
 * Async version of flatten.
 */
export function flattenAsync<T>(result: FireflyAsyncResult<FireflyAsyncResult<T>>): FireflyAsyncResult<T> {
    return result.andThen((inner) => inner);
}
