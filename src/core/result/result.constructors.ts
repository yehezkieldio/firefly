import { err, errAsync, ok, okAsync } from "neverthrow";
import {
    conflictError,
    failedError,
    invalidError,
    notFoundError,
    timeoutError,
    unexpectedError,
    validationError,
} from "#/core/result/error.factories";
import type { ErrorResultOptions, FireflyError } from "#/core/result/error.types";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";

/**
 * Creates a successful sync result.
 *
 * @example
 * ```ts
 * return FireflyOk(computedValue);
 * ```
 */
export const FireflyOk = <T>(value: T): FireflyResult<T> => ok(value);

/**
 * Creates a failed sync result.
 *
 * @example
 * ```ts
 * return FireflyErr(validationError({ message: "Invalid input" }));
 * ```
 */
export const FireflyErr = <T = never>(error: FireflyError): FireflyResult<T> => err(error);

/**
 * Creates a successful async result.
 *
 * @example
 * ```ts
 * return FireflyOkAsync(fetchedData);
 * ```
 */
export const FireflyOkAsync = <T>(value: T): FireflyAsyncResult<T> => okAsync(value);

/**
 * Creates a failed async result.
 *
 * @example
 * ```ts
 * return FireflyErrAsync(notFoundError({ message: "Config not found" }));
 * ```
 */
export const FireflyErrAsync = <T = never>(error: FireflyError): FireflyAsyncResult<T> => errAsync(error);

/**
 * Creates a sync validation error result.
 *
 * @example
 * ```ts
 * if (!isValid) return validationErr({ message: "Invalid version format" });
 * ```
 */
export const validationErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(validationError(opts));

/**
 * Creates an async validation error result.
 */
export const validationErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(validationError(opts));

/**
 * Creates a sync not-found error result.
 *
 * @example
 * ```ts
 * if (!file) return notFoundErr({ message: "Config file not found" });
 * ```
 */
export const notFoundErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(notFoundError(opts));

/**
 * Creates an async not-found error result.
 */
export const notFoundErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(notFoundError(opts));

/**
 * Creates a sync conflict error result.
 *
 * @example
 * ```ts
 * if (exists) return conflictErr({ message: "Item already exists" });
 * ```
 */
export const conflictErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(conflictError(opts));

/**
 * Creates an async conflict error result.
 */
export const conflictErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(conflictError(opts));

/**
 * Creates a sync failed error result.
 *
 * @example
 * ```ts
 * return failedErr({ message: "Operation failed", details: stderr });
 * ```
 */
export const failedErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(failedError(opts));

/**
 * Creates an async failed error result.
 */
export const failedErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(failedError(opts));

/**
 * Creates a sync invalid error result.
 *
 * @example
 * ```ts
 * if (!taskFn) return invalidErr({ message: "Task must have an execute function" });
 * ```
 */
export const invalidErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(invalidError(opts));

/**
 * Creates an async invalid error result.
 */
export const invalidErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(invalidError(opts));

/**
 * Creates a sync timeout error result.
 *
 * @example
 * ```ts
 * return timeoutErr({ message: "Operation timed out after 30s" });
 * ```
 */
export const timeoutErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(timeoutError(opts));

/**
 * Creates an async timeout error result.
 */
export const timeoutErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(timeoutError(opts));

/**
 * Creates a sync unexpected error result.
 *
 * @example
 * ```ts
 * return unexpectedErr({ message: "Unknown error occurred" });
 * ```
 */
export const unexpectedErr = <T = never>(opts: ErrorResultOptions): FireflyResult<T> => err(unexpectedError(opts));

/**
 * Creates an async unexpected error result.
 */
export const unexpectedErrAsync = <T = never>(opts: ErrorResultOptions): FireflyAsyncResult<T> =>
    errAsync(unexpectedError(opts));
