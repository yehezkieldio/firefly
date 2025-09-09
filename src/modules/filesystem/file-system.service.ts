import { ResultAsync, okAsync } from "neverthrow";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class FileSystemService {
    static read(path: string): FireflyAsyncResult<string> {
        return FileSystemService.exec(Bun.file(path).text(), "Failed to read file").andTee(() => {
            logger.verbose(`FileSystemService: Read file at ${path}`);
        });
    }

    static write(path: string, content: string, dryRun?: boolean): FireflyAsyncResult<void> {
        if (dryRun) {
            logger.verbose("FileSystemService: Dry run mode enabled, not writing file.");
            return okAsync(undefined);
        }

        return FileSystemService.exec(Bun.write(path, content), "Failed to write file")
            .map(() => {})
            .andTee(() => logger.verbose(`FileSystemService: Wrote file at ${path}`));
    }

    static exists(path: string): FireflyAsyncResult<boolean> {
        return FileSystemService.exec(Bun.file(path).exists(), "Failed to check if file exists").andTee(() =>
            logger.verbose(`FileSystemService: Checked existence of file at ${path}`),
        );
    }

    private static exec<T>(promise: Promise<T>, message: string): FireflyAsyncResult<T> {
        return ResultAsync.fromPromise(promise, (e: unknown) =>
            createFireflyError({
                code: "INVALID",
                message,
                source: "filesystem/file-system-service",
                cause: e,
            }),
        );
    }
}
