import {
    type ErrorFactoryOptions,
    type FireflyError,
    type FireflyErrorCode,
    FireflyErrorSchema,
} from "#/core/result/error.types";

/**
 * Creates a frozen FireflyError instance with an attached stack trace.
 *
 * @param error - The FireflyError object to enhance.
 * @returns Frozen FireflyError with an optional stack trace.
 */
export function createFireflyError(error: FireflyError): FireflyError & { stack?: string } {
    const err = new Error(error.message, { cause: error.cause });
    return Object.freeze({
        ...error,
        stack: err.stack,
    });
}

/**
 * Converts an unknown error into a FireflyError.
 *
 * @param err - The unknown error to convert.
 * @param code - The FireflyErrorCode to assign.
 * @param source - The source of the error.
 * @returns FireflyError instance.
 */
export function toFireflyError(
    err: unknown,
    code: FireflyErrorCode = "UNEXPECTED",
    source?: FireflyError["source"]
): FireflyError {
    const base = {
        code,
        message: err instanceof Error ? err.message : String(err),
        cause: err instanceof Error ? err.cause : undefined,
        source,
    };
    return createFireflyError(FireflyErrorSchema.parse(base));
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
