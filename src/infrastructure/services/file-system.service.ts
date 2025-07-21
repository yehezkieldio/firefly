import { ResultAsync } from "neverthrow";
import { ConfigurationError } from "#/shared/utils/error";
import type { FireflyResult } from "#/shared/utils/result";

export class FileSystemService {
    constructor(private readonly path: string) {}

    async read(): Promise<FireflyResult<string>> {
        return this.wrapOperation(Bun.file(this.path).text(), "Failed to read file");
    }

    async write(content: string): Promise<FireflyResult<void>> {
        return this.wrapOperation(Bun.write(this.path, content), "Failed to write file").map(() => undefined);
    }

    async exists(): Promise<FireflyResult<boolean>> {
        return this.wrapOperation(Bun.file(this.path).exists(), "Failed to check if file exists");
    }

    private wrapOperation<T>(promise: Promise<T>, message: string): ResultAsync<T, ConfigurationError> {
        return ResultAsync.fromPromise(promise, (cause) => new ConfigurationError(message, cause as Error));
    }
}
