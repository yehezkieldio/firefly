import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { PreReleaseBase, ReleaseType } from "#/domain/semver/semver.definitions";
import type { Version } from "#/domain/semver/version";

/**
 * Options for bumping a version.
 */
export interface VersionBumpOptions {
    /**
     * The current version to bump from
     */
    readonly currentVersion: Version;

    /**
     * The type of release to perform
     */
    readonly releaseType: ReleaseType;

    /**
     * Optional pre-release identifier (e.g., "alpha", "beta")
     */
    readonly prereleaseIdentifier?: string;

    /**
     * Optional base number for pre-release versions
     */
    readonly prereleaseBase?: PreReleaseBase;
}

/**
 * Service for performing semantic version bump operations.
 */
export interface IVersionBumperService {
    /**
     * Bumps a version according to the specified release type.
     *
     * @param options - Version bump configuration
     * @returns The new version after applying the bump
     */
    bump(options: VersionBumpOptions): FireflyAsyncResult<Version>;
}
