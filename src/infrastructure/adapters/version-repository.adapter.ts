import { err, ok } from "neverthrow";
import { Version } from "#/core/domain/version";
import type { PackageJsonPort } from "#/core/ports/package-json.port";
import type { VersionRepositoryPort } from "#/core/ports/version-repository.port";
import { VersionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class VersionRepositoryAdapter implements VersionRepositoryPort {
    constructor(private readonly packageJsonService: PackageJsonPort) {}

    async getCurrentVersion(): Promise<FireflyResult<Version>> {
        logger.verbose("VersionRepositoryAdapter: Reading current version from package.json...");
        const packageJson = await this.packageJsonService.read();
        if (packageJson.isErr()) {
            return err(packageJson.error);
        }

        const version = packageJson.value.version;
        logger.verbose(`VersionRepositoryAdapter: Found version string: '${version}'`);
        if (!version?.trim()) {
            return err(new VersionError("Version not found or empty in package.json"));
        }

        const versionResult = Version.create(version);
        if (versionResult.isErr()) {
            return err(versionResult.error);
        }

        logger.verbose("VersionRepositoryAdapter: Version string validated and Version object created.");
        return ok(versionResult.value);
    }

    async setVersion(version: Version, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose("VersionRepositoryAdapter: Setting new version in package.json...");
        if (!version) {
            return err(new VersionError("Version cannot be null or undefined"));
        }

        const versionString = version.toString();
        logger.verbose(`VersionRepositoryAdapter: New version string to set: '${versionString}'`);
        if (!versionString.trim()) {
            return err(new VersionError("Version string cannot be empty"));
        }

        const writeResult = await this.packageJsonService.updateVersion(versionString, dryRun);
        if (writeResult.isErr()) {
            return err(new VersionError("Failed to update version in package.json", writeResult.error));
        }

        logger.verbose("VersionRepositoryAdapter: Version updated successfully in package.json.");
        return ok(undefined);
    }
}
