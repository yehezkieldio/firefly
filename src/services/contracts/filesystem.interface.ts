import type { FireflyAsyncResult } from "#/core/result/result.types";

/**
 * Options for file write operations.
 */
export interface WriteOptions {
    /**
     * When true, the operation is simulated without making actual changes.
     */
    readonly dryRun?: boolean;
}

/**
 * Service for file system operations.
 */
export interface IFileSystemService {
    /**
     * Checks if a file or directory exists.
     *
     * @param path - Path relative to the workspace root, or absolute
     */
    exists(path: string): FireflyAsyncResult<boolean>;

    /**
     * Reads the contents of a text file.
     *
     * @param path - Path relative to the workspace root, or absolute
     * @returns File contents as a string, or error if not found
     */
    read(path: string): FireflyAsyncResult<string>;

    /**
     * Writes content to a text file.
     *
     * @param path - Path relative to the workspace root, or absolute
     * @param content - String content to write
     * @param options - Write options including dry-run support
     */
    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void>;
}
