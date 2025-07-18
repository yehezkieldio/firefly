import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { consola } from "consola";
import { Version } from "#/core/domain/version.js";
import type { IVersionRepository } from "#/core/ports/version.port.js";
import type { ArtemisResult } from "#/shared/result.js";
import { err, ok, VersionError } from "#/shared/result.js";

export class VersionRepositoryAdapter implements IVersionRepository {
    private readonly packageJsonPath: string;
    private readonly basePath: string;

    constructor(basePath: string = process.cwd()) {
        this.basePath = basePath;
        this.packageJsonPath = join(this.basePath, "package.json");
    }

    async getCurrentVersion(): Promise<ArtemisResult<Version>> {
        try {
            const packageJson = JSON.parse(
                readFileSync(this.packageJsonPath, "utf8")
            );

            if (!packageJson.version) {
                return err(
                    new VersionError("No version found in package.json")
                );
            }

            return ok(new Version(packageJson.version));
        } catch (error) {
            consola.error("Failed to read version from package.json:", error);
            return err(
                new VersionError(
                    "Failed to read version from package.json",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async setVersion(version: Version): Promise<ArtemisResult<void>> {
        try {
            const packageJson = JSON.parse(
                readFileSync(this.packageJsonPath, "utf8")
            );
            packageJson.version = version.toString();

            writeFileSync(
                this.packageJsonPath,
                `${JSON.stringify(packageJson, null, 2)}\n`
            );

            consola.success(
                `Updated version to ${version.toString()} in package.json`
            );
            return ok(undefined);
        } catch (error) {
            consola.error("Failed to update version in package.json:", error);
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
