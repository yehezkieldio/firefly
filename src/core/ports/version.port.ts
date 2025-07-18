import type { Version } from "#/core/domain/version.js";
import type { ArtemisResult } from "#/shared/result.js";

export interface IVersionRepository {
    /**
     * Get the current version from the project
     */
    getCurrentVersion(): Promise<ArtemisResult<Version>>;

    /**
     * Set the version in the project
     */
    setVersion(version: Version): Promise<ArtemisResult<void>>;

    /**
     * Check if a version file exists
     */
    hasVersionFile(): Promise<boolean>;

    /**
     * Get the path to the version file
     */
    getVersionFilePath(): string;
}
