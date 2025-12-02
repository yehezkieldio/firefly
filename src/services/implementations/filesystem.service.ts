import { notFoundErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { wrapPromise } from "#/core/result/result.utilities";
import { withDryRun } from "#/infrastructure/dry-run";
import { logger } from "#/infrastructure/logging";
import type { IFileSystemService, WriteOptions } from "#/services/contracts/filesystem.interface";

/**
 * Default implementation of the file system service.
 */
export class DefaultFileSystemService implements IFileSystemService {
    /**
     * The workspace root directory used for resolving relative paths.
     */
    private readonly basePath: string;

    /**
     * Creates a new file system service.
     */
    constructor(basePath: string) {
        this.basePath = basePath;
    }

    /**
     * Resolves a file path to an absolute path.
     *
     * @param path - The file path to resolve.
     * @returns The resolved absolute file path.
     */
    private resolvePath(path: string): string {
        if (path.startsWith("/")) {
            return path;
        }
        return `${this.basePath}/${path}`;
    }

    exists(path: string): FireflyAsyncResult<boolean> {
        const resolved = this.resolvePath(path);
        return wrapPromise(Bun.file(resolved).exists()).andTee(() =>
            logger.verbose(`DefaultFileSystemService: Checked existence of file: ${resolved}`)
        );
    }

    read(path: string): FireflyAsyncResult<string> {
        const resolved = this.resolvePath(path);
        const file = Bun.file(resolved);

        return wrapPromise(file.exists()).andThen((fileExists) => {
            if (!fileExists) {
                return notFoundErrAsync({
                    message: `File not found: ${resolved}`,
                });
            }
            return wrapPromise(file.text()).andTee(() =>
                logger.verbose(`DefaultFileSystemService: Read file: ${resolved}`)
            );
        });
    }

    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void> {
        return withDryRun(options, `Writing to ${this.resolvePath(path)}`, () =>
            wrapPromise(Bun.write(this.resolvePath(path), content).then(() => {})).andTee(() =>
                logger.verbose(`DefaultFileSystemService: Wrote file: ${this.resolvePath(path)}`)
            )
        );
    }
}

/**
 * Creates a file system service instance.
 */
export function createFileSystemService(basePath: string): IFileSystemService {
    return new DefaultFileSystemService(basePath);
}
