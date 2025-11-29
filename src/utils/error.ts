import { z } from "zod";

// ============================================================================
// Schema Definitions
// ============================================================================

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

// ============================================================================
// Core Error Creation
// ============================================================================

/**
 * Creates a frozen FireflyError with stack trace.
 * Uses native Error.cause for proper error chaining.
 *
 * @param error - Error properties to include
 * @returns Frozen error object with stack trace
 */
export function createFireflyError(error: FireflyError): FireflyError & { stack?: string } {
    // Use native Error.cause for proper error chaining and debugging tools support
    const err = new Error(error.message, { cause: error.cause });
    return Object.freeze({
        ...error,
        stack: err.stack,
    });
}

/**
 * Converts an unknown error to a FireflyError.
 *
 * @param e - Unknown error to convert
 * @param code - Error code to use (defaults to "UNEXPECTED")
 * @param source - Optional source identifier
 * @returns Converted FireflyError
 */
export function toFireflyError(
    e: unknown,
    code: FireflyErrorCode = "UNEXPECTED",
    source?: FireflyError["source"]
): FireflyError {
    const base = {
        code,
        message: e instanceof Error ? e.message : String(e),
        cause: e,
        source,
    };
    return createFireflyError(FireflyErrorSchema.parse(base));
}

// ============================================================================
// Specialized Error Factories
// ============================================================================

interface ErrorFactoryOptions {
    readonly message: string;
    readonly source?: string;
    readonly details?: unknown;
    readonly retryable?: boolean;
}

/**
 * Creates a validation error.
 *
 * @example
 * ```ts
 * return FireflyErr(validationError({ message: "Invalid version format", source: "release" }));
 * ```
 */
export function validationError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "VALIDATION", ...opts });
}

/**
 * Creates a not-found error.
 *
 * @example
 * ```ts
 * return FireflyErr(notFoundError({ message: "Config file not found", source: "cli" }));
 * ```
 */
export function notFoundError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "NOT_FOUND", ...opts });
}

/**
 * Creates a conflict error.
 *
 * @example
 * ```ts
 * return FireflyErr(conflictError({ message: "Working directory is not clean" }));
 * ```
 */
export function conflictError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "CONFLICT", ...opts });
}

/**
 * Creates an IO error.
 *
 * @example
 * ```ts
 * return FireflyErr(ioError({ message: "Failed to write file", retryable: true }));
 * ```
 */
export function ioError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "IO", ...opts });
}

/**
 * Creates a timeout error.
 *
 * @example
 * ```ts
 * return FireflyErr(timeoutError({ message: "Operation timed out after 30s", retryable: true }));
 * ```
 */
export function timeoutError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "TIMEOUT", ...opts });
}

/**
 * Creates a failed operation error.
 *
 * @example
 * ```ts
 * return FireflyErr(failedError({ message: "Git command failed", details: stderr }));
 * ```
 */
export function failedError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "FAILED", ...opts });
}

/**
 * Creates an invalid state/input error.
 *
 * @example
 * ```ts
 * return FireflyErr(invalidError({ message: "Invalid bump type specified" }));
 * ```
 */
export function invalidError(opts: ErrorFactoryOptions): FireflyError {
    return createFireflyError({ code: "INVALID", ...opts });
}

/**
 * Creates an unexpected error.
 *
 * @example
 * ```ts
 * return FireflyErr(unexpectedError({ message: "Something went wrong", cause: e }));
 * ```
 */
export function unexpectedError(opts: ErrorFactoryOptions & { cause?: unknown }): FireflyError {
    return createFireflyError({ code: "UNEXPECTED", ...opts });
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Type guard to check if a value is a FireflyError.
 */
export function isFireflyError(value: unknown): value is FireflyError {
    return FireflyErrorSchema.safeParse(value).success;
}

/**
 * Enriches an existing error with additional context.
 *
 * @param error - Original error
 * @param enrichment - Additional properties to merge
 * @returns New error with merged properties
 *
 * @example
 * ```ts
 * const enriched = enrichError(originalError, { source: "release/preflight", details: { branch } });
 * ```
 */
export function enrichError(
    error: FireflyError,
    enrichment: Partial<Pick<FireflyError, "source" | "details" | "retryable">>
): FireflyError {
    return createFireflyError({ ...error, ...enrichment });
}

/**
 * Wraps an error message with additional context prefix.
 *
 * @param error - Original error
 * @param prefix - Message prefix to add
 * @returns New error with prefixed message
 *
 * @example
 * ```ts
 * const wrapped = wrapErrorMessage(error, "Failed to execute release");
 * // Result: "Failed to execute release: original message"
 * ```
 */
export function wrapErrorMessage(error: FireflyError, prefix: string): FireflyError {
    return createFireflyError({
        ...error,
        message: `${prefix}: ${error.message}`,
    });
}
