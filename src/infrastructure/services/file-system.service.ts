import { ResultAsync } from "neverthrow";
import { ConfigurationError, type FireflyResult } from "#/shared/result";

export class FileSystemService {
    constructor(private readonly path: string) {}

    async read(): Promise<FireflyResult<string>> {
        return this.wrap(Bun.file(this.path).text(), "Failed to read file");
    }

    async write(content: string): Promise<FireflyResult<void>> {
        return this.wrap(Bun.write(this.path, content), "Failed to write file").map(() => undefined);
    }

    async exists(): Promise<FireflyResult<boolean>> {
        return this.wrap(Bun.file(this.path).exists(), "Failed to check if file exists");
    }

    private wrap<T>(promise: Promise<T>, message: string): ResultAsync<T, ConfigurationError> {
        return ResultAsync.fromPromise(promise, (cause) => new ConfigurationError(message, cause as Error));
    }
}
