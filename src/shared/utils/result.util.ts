import type { Result, ResultAsync } from "neverthrow";
import type { FireflyError } from "#/shared/utils/error.util";

/**
 * Represents a result that can be returned from a function.
 *
 * @example
 * ```ts
 * const result = someFunction(); // someFunction returns FireflyResult<T>
 * if (result.isErr()) {
 *  // Handle the error
 * }
 *
 * result.value; // This will be the successful value of type T
 * ```
 */
export type FireflyResult<T> = Result<T, FireflyError>;

/**
 * Represents a result that can be returned that needs to be awaited.
 *
 * @example
 * ```ts
 * const result = await someAsyncFunction(); // someAsyncFunction returns AsyncFireflyResult<T>
 * if (result.isErr()) {
 *  // Handle the error
 * }
 *
 * result.value; // This will be the successful value of type T
 * ```
 */
export type AsyncFireflyResult<T> = ResultAsync<T, FireflyError>;
