import { okAsync } from "neverthrow";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

/**
 * Options for dry-run aware operations.
 */
export interface DryRunOptions {
    /** When true, skip the actual operation and log instead */
    readonly dryRun?: boolean;
}

/**
 * Wraps an async operation with dry-run awareness.
 *
 * When `dryRun` is enabled, logs the intended operation and returns
 * a successful result without executing the actual operation.
 *
 * @template T - The return type of the operation
 * @param options - Configuration including the dry-run flag
 * @param message - Description of the operation (logged in dry-run mode)
 * @param operation - The actual operation to execute when not in dry-run mode
 * @returns The operation result, or a dry-run placeholder
 *
 * @example
 * ```typescript
 * // In a service method:
 * write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void> {
 *   return withDryRun(
 *     options,
 *     `Writing to ${path}`,
 *     () => wrapPromise(Bun.write(path, content).then(() => {}))
 *   );
 * }
 * ```
 */
export function withDryRun<T>(
    options: DryRunOptions | undefined,
    message: string,
    operation: () => FireflyAsyncResult<T>
): FireflyAsyncResult<T> {
    if (options?.dryRun) {
        logger.verbose(`Dry run: ${message}`);
        return okAsync(undefined as T);
    }
    return operation();
}

/**
 * Creates a dry-run aware wrapper for a specific operation category.
 *
 * Useful when you have multiple operations in a service that share
 * the same logging prefix.
 *
 * @param prefix - The prefix to use in log messages (e.g., "GitService", "FileSystem")
 * @returns A function that wraps operations with dry-run handling
 *
 * @example
 * ```typescript
 * const gitDryRun = createDryRunWrapper("GitService");
 *
 * // Later in methods:
 * commit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult> {
 *   return gitDryRun(options, "commit", () => this.executeCommit(message, options));
 * }
 * ```
 */
export function createDryRunWrapper(prefix: string) {
    return <T>(
        options: DryRunOptions | undefined,
        operationName: string,
        operation: () => FireflyAsyncResult<T>
    ): FireflyAsyncResult<T> => withDryRun(options, `${prefix}: ${operationName}`, operation);
}
