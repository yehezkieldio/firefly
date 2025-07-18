import type { Version } from "#/core/domain/version";
import type { FireflyResult } from "#/shared/result";

export interface IVersionRepository {
    /**
     * Get the current version from the project
     */
    getCurrentVersion(): Promise<FireflyResult<Version>>;

    /**
     * Set the version in the project
     */
    setVersion(version: Version): Promise<FireflyResult<void>>;

    /**
     * Check if a version file exists
     */
    hasVersionFile(): Promise<boolean>;

    /**
     * Get the path to the version file
     */
    getVersionFilePath(): string;
}
