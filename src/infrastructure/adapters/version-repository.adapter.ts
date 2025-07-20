import { err, ok } from "neverthrow";
import { Version } from "#/core/domain/version";
import type { PackageJsonPort } from "#/core/ports/package-json.port";
import type { VersionRepositoryPort } from "#/core/ports/version-repository.port";
import { VersionError } from "#/shared/utils/error";
import type { FireflyResult } from "#/shared/utils/result";

export class VersionRepositoryAdapter implements VersionRepositoryPort {
    constructor(private readonly packageJsonService: PackageJsonPort) {}

    async getCurrentVersion(): Promise<FireflyResult<Version>> {
        const packageJson = await this.packageJsonService.read();
        if (packageJson.isErr()) {
            return err(packageJson.error);
        }

        const version = packageJson.value.version;
        if (!version?.trim()) {
            return err(new VersionError("Version not found or empty in package.json"));
        }

        try {
            return ok(new Version(version));
        } catch (error) {
            return err(new VersionError(`Invalid version format: ${version}`, error as Error));
        }
    }

    async setVersion(version: Version): Promise<FireflyResult<void>> {
        if (!version) {
            return err(new VersionError("Version cannot be null or undefined"));
        }

        const versionString = version.toString();
        if (!versionString.trim()) {
            return err(new VersionError("Version string cannot be empty"));
        }

        const writeResult = await this.packageJsonService.updateVersion(versionString);
        if (writeResult.isErr()) {
            return err(new VersionError("Failed to update version in package.json", writeResult.error));
        }

        return ok(undefined);
    }

    async hasVersionFile(): Promise<boolean> {
        const packageJson = await this.packageJsonService.read();

        if (packageJson.isErr()) {
            return false;
        }

        return packageJson.value.version !== undefined;
    }
}
