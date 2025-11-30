import type { Result, ResultAsync } from "neverthrow";
import type { FireflyError } from "#/core/result/error.types";

/**
 * - Represents `Result<T, FireflyError>`.
 * - Can be wrapped in a `Promise<FireflyResult<T>>` when internally unwrapping a `FireflyAsyncResult<T>`.
 *
 * @example
 * ```ts
 * function computeValue(): FireflyResult<number> {
 *   return FireflyOk(42);
 * }
 * ```
 */
export type FireflyResult<T> = Result<T, FireflyError>;

/**
 * - Represents `ResultAsync<T, FireflyError>`.
 * - **Do not** wrap in another `Promise`.
 * - **Do not** mark functions returning this type as `async`.
 *
 * @example
 * ```ts
 * function fetchValue(): FireflyAsyncResult<number> {
 *  return FireflyOkAsync(42);
 * }
 */
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;
