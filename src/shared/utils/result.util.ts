import { type Result, ResultAsync, err, ok } from "neverthrow";
import type z from "zod";
import { type FireflyError, createFireflyError, toFireflyError } from "#/shared/utils/error.util";

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

export function parseSchema<TSchema extends z.ZodType>(
    schema: TSchema,
    data: unknown,
): FireflyResult<z.infer<TSchema>> {
    const result = schema.safeParse(data);
    if (result.success) {
        return ok(result.data);
    }

    return err(createFireflyError(toFireflyError(result.error)));
}

export function parseSchemaAsync<TSchema extends z.ZodType>(
    schema: TSchema,
    data: unknown,
): FireflyAsyncResult<z.infer<TSchema>> {
    return ResultAsync.fromPromise(schema.parseAsync(data), (error) => createFireflyError(toFireflyError(error)));
}
