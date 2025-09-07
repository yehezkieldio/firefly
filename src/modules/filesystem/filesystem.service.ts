import { okAsync } from "neverthrow";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, wrapPromise } from "#/shared/utils/result.util";

export class FileSystemService {
    constructor(private readonly path: string) {}

    read(): FireflyAsyncResult<string> {
        return wrapPromise(Bun.file(this.path).text()).andTee(() =>
            logger.verbose(`FileSystemService: Read file at ${this.path}`),
        );
    }

    write(content: string, dryRun?: boolean): FireflyAsyncResult<void> {
        if (dryRun) {
            return okAsync(undefined).andTee(() =>
                logger.verbose(`FileSystemService: Dry run enabled, skipping write to ${this.path}`),
            );
        }

        return wrapPromise(Bun.write(this.path, content))
            .map(() => {})
            .andTee(() => logger.verbose(`FileSystemService: Wrote file at ${this.path}`));
    }

    exists(): FireflyAsyncResult<boolean> {
        return wrapPromise(Bun.file(this.path).exists()).andTee(() =>
            logger.verbose(`FileSystemService: Checked existence of ${this.path}`),
        );
    }
}
