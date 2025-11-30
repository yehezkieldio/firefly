import { notFoundErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { wrapPromise } from "#/core/result/result.utilities";
import { withDryRun } from "#/infrastructure/dry-run";
import type { IFileSystemService, WriteOptions } from "#/services/contracts/filesystem.interface";

export class DefaultFileSystemService implements IFileSystemService {
    private readonly basePath: string;

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
        return wrapPromise(Bun.file(resolved).exists());
    }

    read(path: string): FireflyAsyncResult<string> {
        const resolved = this.resolvePath(path);
        const file = Bun.file(resolved);

        return wrapPromise(file.exists()).andThen((fileExists) => {
            if (!fileExists) {
                return notFoundErrAsync({
                    message: `File not found: ${resolved}`,
                    source: "FileSystemService.read",
                });
            }
            return wrapPromise(file.text());
        });
    }

    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void> {
        return withDryRun(options, `Writing to ${this.resolvePath(path)}`, () =>
            wrapPromise(Bun.write(this.resolvePath(path), content).then(() => {}))
        );
    }
}

/**
 * Creates a file system service instance.
 * @param basePath - Base path for relative file resolution
 */
export function createFileSystemService(basePath: string): IFileSystemService {
    return new DefaultFileSystemService(basePath);
}
