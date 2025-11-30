import z from "zod";

/**
 * Canonical list of Firefly error codes used for classification and handling.
 *
 * - `VALIDATION`: Input or schema validation failure.
 * - `NOT_FOUND`: Resource not present or lookup failed.
 * - `CONFLICT`: Business-logic or state conflicts.
 * - `IO`: I/O related errors such as file system or network failures.
 * - `TIMEOUT`: Operations that exceeded an allowed time window.
 * - `UNEXPECTED`: Unexpected or unknown errors.
 * - `FAILED`: Generic operation failure where a command or task returned an error code.
 * - `INVALID`: Invalid state or arguments not covered by `VALIDATION`.
 */
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

/**
 * Standardized Firefly error shape validated using Zod. This object is the
 * canonical structure used throughout the codebase to represent errors.
 *
 * - `code`: One of `FireflyErrorCodeSchema` values that categorizes the error.
 * - `message`: A human-friendly explanatory message for the error.
 * - `details`: Optional additional structured or unstructured data with context.
 * - `cause`: Optional underlying error or value that caused this error (opaque).
 * - `retryable`: Optional boolean indicating whether the operation may be retried.
 * - `source`: Optional string describing the subsystem or module that emitted the error.
 */
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
 * Options used when creating an error to be wrapped as a result.
 */
export interface ErrorResultOptions {
    readonly message: string;
    readonly source?: string;
    readonly details?: unknown;
}

/**
 * Options for error factories that generate `FireflyError` objects.
 */
export interface ErrorFactoryOptions {
    readonly message: string;
    readonly source?: string;
    readonly details?: unknown;
    readonly retryable?: boolean;
}
