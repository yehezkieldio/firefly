import { type FireflyError, FireflyErrorSchema, createFireflyError } from "#/shared/utils/error.util";

/**
 * Returns a new FireflyError with additional context prepended to the message.
 * Does not mutate the original error.
 */
export function withErrorContext(error: FireflyError, context: string): FireflyError {
    return createFireflyError({
        ...error,
        message: `${context}: ${error.message}`,
    });
}

/**
 * Type guard to check if a value is a FireflyError.
 */
export function isFireflyError(value: unknown): value is FireflyError {
    return FireflyErrorSchema.safeParse(value).success;
}

/**
 * Aggregates multiple errors into a single error.
 */
export function aggregateErrors(errors: FireflyError[], context?: string): FireflyError {
    if (errors.length === 0) {
        return createFireflyError({
            code: "UNEXPECTED",
            message: "No errors to aggregate",
            source: "application",
        });
    }

    if (errors.length === 1) {
        const firstError = errors[0];
        if (!firstError) {
            return createFireflyError({
                code: "UNEXPECTED",
                message: "Invalid error in array",
                source: "application",
            });
        }
        return context ? withErrorContext(firstError, context) : firstError;
    }

    const message = context ? `${context}: ${errors.length} errors occurred` : `${errors.length} errors occurred`;

    return createFireflyError({
        code: "FAILED",
        message,
        details: errors.map((e) => ({
            code: e.code,
            message: e.message,
            details: e.details,
        })),
        source: "application",
    });
}

/**
 * Chains multiple error contexts together.
 */
export function chainErrorContexts(error: FireflyError, ...contexts: string[]): FireflyError {
    return contexts.reduce((err, ctx) => withErrorContext(err, ctx), error);
}

/**
 * Extracts the root cause from an error chain.
 */
export function getRootCause(error: FireflyError): unknown {
    let current: unknown = error;

    while (current && typeof current === "object" && "cause" in current) {
        const cause = (current as { cause?: unknown }).cause;
        if (cause === undefined || cause === null) break;
        current = cause;
    }

    return current;
}

/**
 * Formats an error for logging with full details.
 */
export function formatErrorForLogging(error: FireflyError): string {
    const parts: string[] = [`[${error.code}] ${error.message}`];

    if (error.source) {
        parts.push(`Source: ${error.source}`);
    }

    if (error.retryable) {
        parts.push("Retryable: true");
    }

    if (error.details) {
        parts.push(`Details: ${JSON.stringify(error.details, null, 2)}`);
    }

    const rootCause = getRootCause(error);
    if (rootCause && rootCause !== error) {
        parts.push(`Root cause: ${rootCause}`);
    }

    if ("stack" in error && error.stack) {
        parts.push(`Stack:\n${error.stack}`);
    }

    return parts.join("\n");
}

/**
 * Creates a retryable error wrapper.
 */
export function makeRetryable(error: FireflyError): FireflyError {
    return createFireflyError({
        ...error,
        retryable: true,
    });
}

/**
 * Checks if an error is retryable.
 */
export function isRetryable(error: FireflyError): boolean {
    return error.retryable === true;
}

/**
 * Creates an error with a specific source.
 */
export function withErrorSource(error: FireflyError, source: FireflyError["source"]): FireflyError {
    return createFireflyError({
        ...error,
        source,
    });
}

/**
 * Wraps an error with additional details.
 */
export function withErrorDetails(error: FireflyError, details: unknown): FireflyError {
    return createFireflyError({
        ...error,
        details: {
            ...(typeof error.details === "object" && error.details !== null ? error.details : {}),
            ...(typeof details === "object" && details !== null ? details : { value: details }),
        },
    });
}
