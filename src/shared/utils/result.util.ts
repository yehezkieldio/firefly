import type { Result, ResultAsync } from "neverthrow";
import type { FireflyError } from "#/shared/utils/error.util";

/**
 * - Represents `Result<T, FireflyError>`.
 * - Can be wrapped in a `Promise<FireflyResult<T>>` when internally unwrapping a `FireflyAsyncResult<T>`.
 *
 * @template T The success value type.
 */
export type FireflyResult<T> = Result<T, FireflyError>;

/**
 * - Represents `ResultAsync<T, FireflyError>`.
 * - **Do not** wrap in another `Promise`.
 * - **Do not** mark functions returning this type as `async`.
 *
 * @template T The success value type.
 */
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;
