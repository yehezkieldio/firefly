import { errAsync, ok, okAsync } from "neverthrow";
import { type PackageJson, type PackageJsonPort, PackageJsonSchema } from "#/core/ports/package-json.port";
import type { FileSystemService } from "#/infrastructure/services/file-system.service";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult } from "#/shared/utils/result.util";
import { safeJsonParse } from "#/shared/utils/safe-json-parse.util";

export class FsPackageJsonAdapter implements PackageJsonPort {
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    constructor(private readonly fileSystem: FileSystemService) {}

    async read(): Promise<AsyncFireflyResult<PackageJson>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        return this.parseAndValidatePackageJson(contentResult.value);
    }

    async updateVersion(version: string, dryRun?: boolean): Promise<AsyncFireflyResult<void>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        const updatedContent = this.replaceVersionInContent(contentResult.value, version);
        const writeResult = await this.fileSystem.write(updatedContent, dryRun);
        if (writeResult.isErr()) {
            return errAsync(writeResult.error);
        }

        return this.verifyVersionUpdate(version, dryRun);
    }

    private parseAndValidatePackageJson(content: string): AsyncFireflyResult<PackageJson> {
        const parseResult = safeJsonParse(content);
        if (parseResult.isErr()) {
            return errAsync(new ConfigurationError("Failed to parse package.json", parseResult.error));
        }

        const validationResult = PackageJsonSchema.safeParse(parseResult.value);
        if (!validationResult.success) {
            return errAsync(new ConfigurationError("package.json validation failed", validationResult.error));
        }

        return okAsync(validationResult.data);
    }

    private replaceVersionInContent(content: string, version: string): string {
        return content.replace(FsPackageJsonAdapter.VERSION_REGEX, `$1"${version}"$2`);
    }

    private async verifyVersionUpdate(expectedVersion: string, dryRun?: boolean): Promise<AsyncFireflyResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return errAsync(readResult.error);
        }

        if (dryRun) {
            logger.verbose("FsPackageJsonAdapter: Dry run mode enabled, not verifying version update.");
            return ok(undefined);
        }

        if (readResult.value.version !== expectedVersion) {
            return errAsync(
                new ConfigurationError(
                    `Version update failed: expected ${expectedVersion}, got ${readResult.value.version}`
                )
            );
        }

        return ok(undefined);
    }
}
