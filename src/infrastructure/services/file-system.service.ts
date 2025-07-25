import { okAsync, ResultAsync } from "neverthrow";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult } from "#/shared/utils/result.util";

export class FileSystemService {
    constructor(private readonly path: string) {}

    async read(): Promise<AsyncFireflyResult<string>> {
        return this.wrapOperation(Bun.file(this.path).text(), "Failed to read file").andTee(() =>
            logger.verbose(`FileSystemService: Read file at ${this.path}`)
        );
    }

    async write(content: string, dryRun?: boolean): Promise<AsyncFireflyResult<void>> {
        if (dryRun) {
            logger.verbose("FileSystemService: Dry run mode enabled, not writing file.");
            return okAsync(undefined);
        }

        return this.wrapOperation(Bun.write(this.path, content), "Failed to write file")
            .map(() => undefined)
            .andTee(() => logger.verbose(`FileSystemService: Wrote file at ${this.path}`));
    }

    async exists(): Promise<AsyncFireflyResult<boolean>> {
        return this.wrapOperation(Bun.file(this.path).exists(), "Failed to check if file exists").andTee(() =>
            logger.verbose(`FileSystemService: Checked existence of file at ${this.path}`)
        );
    }

    private wrapOperation<T>(promise: Promise<T>, message: string): AsyncFireflyResult<T> {
        return ResultAsync.fromPromise(promise, (cause) => new ConfigurationError(message, cause as Error));
    }
}
