import { readFileSync } from "node:fs";
import { join } from "node:path";
import { err, ok } from "neverthrow";
import { Version } from "#/core/domain/version";
import type { IVersionRepository } from "#/core/ports/version.port";
import { PackageJsonService } from "#/infrastructure/services/package-json.service";
import { logger } from "#/shared/logger";
import { type FireflyResult, VersionError } from "#/shared/result";

export class VersionRepositoryAdapter implements IVersionRepository {
    private readonly packageJsonPath: string;
    private readonly basePath: string;

    constructor(basePath: string = process.cwd()) {
        this.basePath = basePath;
        this.packageJsonPath = join(this.basePath, "package.json");
    }

    async getCurrentVersion(): Promise<FireflyResult<Version>> {
        try {
            const packageJsonService = new PackageJsonService(this.basePath);
            const packageJson = await packageJsonService.read();

            if (!packageJson?.version) {
                return err(new VersionError("No version found in package.json"));
            }

            return ok(new Version(packageJson.version));
        } catch (error) {
            logger.error("Failed to read version from package.json:", error);
            return err(
                new VersionError(
                    "Failed to read version from package.json",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async setVersion(version: Version): Promise<FireflyResult<void>> {
        try {
            const packageJsonService = new PackageJsonService(this.basePath);
            const packageJson = await packageJsonService.read();

            if (!packageJson) {
                return err(new VersionError("Failed to read package.json"));
            }

            packageJsonService.updateVersion(version.toString());

            logger.success(`Updated version to ${version.toString()} in package.json`);
            return ok(undefined);
        } catch (error) {
            logger.error("Failed to update version in package.json:", error);
            return err(
                new VersionError(
                    "Failed to update version in package.json",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async hasVersionFile(): Promise<boolean> {
        try {
            readFileSync(this.packageJsonPath, "utf8");
            return true;
        } catch {
            return false;
        }
    }

    getVersionFilePath(): string {
        return this.packageJsonPath;
    }
}
