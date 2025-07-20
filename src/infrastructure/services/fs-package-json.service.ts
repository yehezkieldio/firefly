import { err, ok } from "neverthrow";
import { type PackageJson, type PackageJsonPort, PackageJsonSchema } from "#/core/ports/package-json.port";
import type { FileSystemService } from "#/infrastructure/services/file-system.service";
import { ConfigurationError } from "#/shared/utils/error";
import type { FireflyResult } from "#/shared/utils/result";
import { safeJsonParse } from "#/shared/utils/safe-json-parse";

export class FsPackageJsonService implements PackageJsonPort {
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    constructor(private readonly fileSystem: FileSystemService) {}

    async read(): Promise<FireflyResult<PackageJson>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        return this.parseAndValidatePackageJson(contentResult.value);
    }

    async updateVersion(version: string): Promise<FireflyResult<void>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        const updatedContent = this.replaceVersionInContent(contentResult.value, version);
        const writeResult = await this.fileSystem.write(updatedContent);
        if (writeResult.isErr()) {
            return err(writeResult.error);
        }

        return this.verifyVersionUpdate(version);
    }

    private parseAndValidatePackageJson(content: string): FireflyResult<PackageJson> {
        const parseResult = safeJsonParse(content);
        if (parseResult.isErr()) {
            return err(new ConfigurationError("Failed to parse package.json", parseResult.error));
        }

        const validationResult = PackageJsonSchema.safeParse(parseResult.value);
        if (!validationResult.success) {
            return err(new ConfigurationError("package.json validation failed", validationResult.error));
        }

        return ok(validationResult.data);
    }

    private replaceVersionInContent(content: string, version: string): string {
        return content.replace(FsPackageJsonService.VERSION_REGEX, `$1"${version}"$2`);
    }

    private async verifyVersionUpdate(expectedVersion: string): Promise<FireflyResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return err(readResult.error);
        }

        if (readResult.value.version !== expectedVersion) {
            return err(
                new ConfigurationError(
                    `Version update failed: expected ${expectedVersion}, got ${readResult.value.version}`
                )
            );
        }

        return ok(undefined);
    }
}
