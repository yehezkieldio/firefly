import { errAsync, okAsync } from "neverthrow";
import type { IFileSystemService, WriteJsonOptions, WriteOptions } from "#/shared/interfaces";
import { createFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, wrapPromise } from "#/utils/result";

export class DefaultFileSystemService implements IFileSystemService {
    private readonly basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath;
    }

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
                return errAsync(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `File not found: ${resolved}`,
                        source: "shared/fs",
                    })
                );
            }
            return wrapPromise(file.text());
        });
    }

    readJson<T>(path: string): FireflyAsyncResult<T> {
        const resolved = this.resolvePath(path);
        const file = Bun.file(resolved);

        return wrapPromise(file.exists()).andThen((fileExists) => {
            if (!fileExists) {
                return errAsync(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `File not found: ${resolved}`,
                        source: "shared/fs",
                    })
                );
            }
            return wrapPromise(file.json() as Promise<T>);
        });
    }

    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void> {
        const resolved = this.resolvePath(path);

        if (options?.dryRun) {
            logger.verbose("FileSystemService: Dry run enabled, skipping write to", resolved);
            return okAsync(undefined);
        }

        return wrapPromise(Bun.write(resolved, content).then(() => {}));
    }

    writeJson<T>(path: string, data: T, options?: WriteJsonOptions): FireflyAsyncResult<void> {
        const indent = options?.indent ?? 2;
        const content = JSON.stringify(data, null, indent);
        return this.write(path, content, options);
    }
}

export function createFileSystemService(basePath: string): IFileSystemService {
    return new DefaultFileSystemService(basePath);
}
