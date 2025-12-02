import { ResultAsync } from "neverthrow";
import { createFireflyError, toFireflyError } from "#/core/result/error.factories";
import type { ErrorResultOptions, FireflyError } from "#/core/result/error.types";
import {
    FireflyErr,
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    notFoundErr,
    notFoundErrAsync,
    validationErr,
    validationErrAsync,
} from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";

/**
 * Wraps a Promise into a FireflyAsyncResult, converting any errors into FireflyError.
 *
 * @param promise - The Promise to wrap.
 * @returns FireflyAsyncResult representing the outcome of the Promise.
 */
export function wrapPromise<T>(promise: Promise<T>): FireflyAsyncResult<T> {
    return ResultAsync.fromPromise(promise, (e) => createFireflyError(toFireflyError(e)));
}

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
        if (result.isErr()) return FireflyErr(result.error);
        values.push(result.value);
    }

    return FireflyOk(values);
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
    return condition ? validationErr(errorOpts) : FireflyOk(undefined);
}

/**
 * Async version of ensureNot.
 */
export function ensureNotAsync(condition: boolean, errorOpts: ErrorResultOptions): FireflyAsyncResult<void> {
    return condition ? validationErrAsync(errorOpts) : FireflyOkAsync(undefined);
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
    return condition ? FireflyOk(undefined) : validationErr(errorOpts);
}

/**
 * Async version of ensure.
 */
export function ensureAsync(condition: boolean, errorOpts: ErrorResultOptions): FireflyAsyncResult<void> {
    return condition ? FireflyOkAsync(undefined) : validationErrAsync(errorOpts);
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
    return value !== null && value !== undefined ? FireflyOk(value) : notFoundErr(errorOpts);
}

/**
 * Async version of fromNullable.
 */
export function fromNullableAsync<T>(
    value: T | null | undefined,
    errorOpts: ErrorResultOptions
): FireflyAsyncResult<T> {
    return value !== null && value !== undefined ? FireflyOkAsync(value) : notFoundErrAsync(errorOpts);
}

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
        if (result.isErr()) return FireflyErr(result.error);
        results.push(result.value);
    }

    return FireflyOk(results);
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
        FireflyOkAsync([])
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
        if (result.isErr()) return FireflyErr(result.error);
        if (predicate(result.value)) {
            values.push(result.value);
        }
    }

    return FireflyOk(values);
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
    return result.orElse((error) => (codes.includes(error.code) ? recovery(error) : FireflyErrAsync(error)));
}

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
    if (resultA.isErr()) return FireflyErr(resultA.error);
    if (resultB.isErr()) return FireflyErr(resultB.error);
    return FireflyOk([resultA.value, resultB.value]);
}

/**
 * Combines three results into a tuple.
 */
export function zip3<A, B, C>(
    resultA: FireflyResult<A>,
    resultB: FireflyResult<B>,
    resultC: FireflyResult<C>
): FireflyResult<[A, B, C]> {
    if (resultA.isErr()) return FireflyErr(resultA.error);
    if (resultB.isErr()) return FireflyErr(resultB.error);
    if (resultC.isErr()) return FireflyErr(resultC.error);
    return FireflyOk([resultA.value, resultB.value, resultC.value]);
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
