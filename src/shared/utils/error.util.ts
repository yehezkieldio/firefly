import { z } from "zod";

export const FireflyErrorCodeSchema = z.enum([
    "VALIDATION",
    "NOT_FOUND",
    "CONFLICT",
    "IO",
    "TIMEOUT",
    "UNEXPECTED",
    "FAILED",
    "INVALID",
]);

export const FireflyErrorSchema = z.object({
    code: FireflyErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
    cause: z.unknown().optional(),
    retryable: z.boolean().optional(),
    source: z.string().optional(),
});

export type FireflyErrorCode = z.infer<typeof FireflyErrorCodeSchema>;
export type FireflyError = Readonly<z.infer<typeof FireflyErrorSchema>>;

/**
 * Creates a firefly error with a stack trace.
 * @param error The firefly error details.
 */
export function createFireflyError(error: FireflyError): FireflyError & { stack?: string } {
    const err = new Error(error.message);
    return Object.freeze({
        ...error,
        stack: err.stack,
    });
}

/**
 * Converts any error into a firefly error.
 * @param e The error to convert.
 * @param code The error code to use. Defaults to 'UNEXPECTED'.
 * @param source The source of the error.
 */
export function toFireflyError(
    e: unknown,
    code: FireflyErrorCode = "UNEXPECTED",
    source?: FireflyError["source"],
): FireflyError {
    const base = {
        code,
        message: e instanceof Error ? e.message : String(e),
        cause: e,
        source,
    };
    return createFireflyError(FireflyErrorSchema.parse(base));
}
