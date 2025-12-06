import semver from "semver";
import {
    FireflyErr,
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    invalidErr,
    invalidErrAsync,
} from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import type { PreReleaseBase } from "#/domain/semver/semver.definitions";
import { Version } from "#/domain/semver/version";
import type { IVersionBumperService, VersionBumpOptions } from "#/services/contracts/version-bumper.interface";

/**
 * Default implementation of the version bumper service.
 */
export class DefaultVersionBumperService implements IVersionBumperService {
    bump(options: VersionBumpOptions): FireflyAsyncResult<Version> {
        const { currentVersion, releaseType, preReleaseId, preReleaseBase } = options;

        if (releaseType === "major" || releaseType === "minor" || releaseType === "patch") {
            const result = this.bumpStandard(currentVersion, releaseType);
            return result.isOk() ? FireflyOkAsync(result.value) : FireflyErrAsync(result.error);
        }

        if (releaseType === "premajor" || releaseType === "preminor" || releaseType === "prepatch") {
            const result = this.bumpPreStandard(currentVersion, releaseType, preReleaseId, preReleaseBase);
            return result.isOk() ? FireflyOkAsync(result.value) : FireflyErrAsync(result.error);
        }

        if (releaseType === "prerelease") {
            const result = this.bumpPrerelease(currentVersion, preReleaseId, preReleaseBase);
            return result.isOk() ? FireflyOkAsync(result.value) : FireflyErrAsync(result.error);
        }

        if (releaseType === "graduate") {
            const result = this.graduatePrerelease(currentVersion);
            return result.isOk() ? FireflyOkAsync(result.value) : FireflyErrAsync(result.error);
        }

        return invalidErrAsync({
            message: `Unsupported release type: ${releaseType}`,
            source: "services/version-bumper",
        });
    }

    /**
     * Normalizes the prerelease base to a string "0" or "1".
     *
     * @param base - The prerelease base to normalize
     * @returns The normalized base or an error if invalid
     */
    private normalizeBase(base?: PreReleaseBase): FireflyResult<"0" | "1" | undefined> {
        if (base === undefined || base === null) {
            return FireflyOk(undefined);
        }

        if (base === "0" || base === "1") {
            return FireflyOk(base);
        }

        if (typeof base === "number" && (base === 0 || base === 1)) {
            return FireflyOk(base.toString() as "0" | "1");
        }

        return invalidErr({
            message: `Invalid preReleaseBase '${base}'. Must be "0", "1", 0, or 1.`,
        });
    }

    /**
     * Determines if the prerelease identifier is complex (contains dots).
     *
     * @param identifier - The prerelease identifier to check
     * @returns True if the identifier is complex, false otherwise
     */
    private isComplexIdentifier(identifier?: string): boolean {
        return typeof identifier === "string" && identifier.includes(".");
    }

    /**
     * Bumps a version with a complex prerelease identifier (e.g., "canary.abc123").
     *
     * @param currentVersion - The current version to bump
     * @param identifier - The complex prerelease identifier
     * @returns The new version with the complex identifier
     */
    private bumpWithComplexIdentifier(currentVersion: Version, identifier?: string): string | null {
        if (!identifier) {
            return semver.inc(currentVersion.raw, "prerelease", undefined, "0");
        }
        return semver.inc(currentVersion.raw, "prerelease", identifier, false);
    }

    /**
     * Bumps an existing prerelease version.
     *
     * @param currentVersion - The current version to bump
     * @param identifier - Optional prerelease identifier
     * @returns The new prerelease version
     */
    private bumpExistingPrerelease(currentVersion: Version, identifier?: string): string | null {
        return identifier
            ? semver.inc(currentVersion.raw, "prerelease", identifier)
            : semver.inc(currentVersion.raw, "prerelease");
    }

    /**
     * Bumps a standard version (major, minor, patch) according to the provided release type.
     *
     * @param currentVersion - The current version to bump
     * @param releaseType - The type of standard release
     * @returns The new standard version
     */
    private bumpStandard(currentVersion: Version, releaseType: "major" | "minor" | "patch"): FireflyResult<Version> {
        let baseVersionString = currentVersion.raw;

        if (currentVersion.isPrerelease) {
            const stableResult = currentVersion.toStable();
            if (stableResult.isErr()) {
                return FireflyErr(stableResult.error);
            }
            baseVersionString = stableResult.value.raw;
        }

        const newVersionString = semver.inc(baseVersionString, releaseType);

        if (!newVersionString) {
            return invalidErr({
                message: `Failed to bump ${releaseType} version from '${baseVersionString}'.`,
                source: "services/version-bumper",
            });
        }

        return Version.fromClean(newVersionString);
    }

    /**
     * Bumps a pre-standard version (premajor, preminor, prepatch) according to the provided options.
     *
     * @param currentVersion - The current version to bump
     * @param releaseType - The type of pre-standard release
     * @param identifier - Optional prerelease identifier (e.g., "alpha", "beta")
     * @param base - Optional base number for the prerelease
     * @returns The new pre-standard version
     */
    private bumpPreStandard(
        currentVersion: Version,
        releaseType: "premajor" | "preminor" | "prepatch",
        preReleaseId?: string,
        preReleaseBase?: PreReleaseBase
    ): FireflyResult<Version> {
        const normalizedBaseResult = this.normalizeBase(preReleaseBase);
        if (normalizedBaseResult.isErr()) {
            return FireflyErr(normalizedBaseResult.error);
        }

        const normalizedBase = normalizedBaseResult.value;
        let newVersionString: string | null = null;

        if (normalizedBase !== undefined) {
            newVersionString = preReleaseId
                ? semver.inc(currentVersion.raw, releaseType, preReleaseId, normalizedBase)
                : semver.inc(currentVersion.raw, releaseType, undefined, normalizedBase);
        } else {
            newVersionString = preReleaseId
                ? semver.inc(currentVersion.raw, releaseType, preReleaseId)
                : semver.inc(currentVersion.raw, releaseType);
        }

        if (!newVersionString) {
            return invalidErr({
                message: `Failed to bump ${releaseType} version from '${currentVersion.raw}' with identifier '${preReleaseId}' and base '${preReleaseBase}'.`,
                source: "services/version-bumper",
            });
        }

        return Version.fromClean(newVersionString);
    }

    /**
     * Bumps a prerelease version according to the provided options.
     * Handles complex identifiers, explicit bases, continuing existing
     * prereleases, and starting new prereleases from stable versions.
     *
     * @param currentVersion - The current version to bump
     * @param identifier - Optional prerelease identifier (e.g., "alpha", "beta")
     * @param base - Optional base number for the prerelease
     * @returns The new prerelease version
     */
    private bumpPrerelease(
        currentVersion: Version,
        preReleaseId?: string,
        preReleaseBase?: PreReleaseBase
    ): FireflyResult<Version> {
        let newVersionString: string | null = null;

        // Case 1: Complex identifier with dots (e.g., "canary.abc123")
        if (this.isComplexIdentifier(preReleaseId)) {
            newVersionString = this.bumpWithComplexIdentifier(currentVersion, preReleaseId);
        }
        // Case 2: Explicit base provided
        else if (preReleaseBase !== undefined && preReleaseBase !== null) {
            const normalizedBaseResult = this.normalizeBase(preReleaseBase);
            if (normalizedBaseResult.isErr()) {
                return FireflyErr(normalizedBaseResult.error);
            }

            const normalizedBase = normalizedBaseResult.value;
            newVersionString = preReleaseId
                ? semver.inc(currentVersion.raw, "prerelease", preReleaseId, normalizedBase)
                : semver.inc(currentVersion.raw, "prerelease", undefined, normalizedBase);
        }
        // Case 3: Continuing existing prerelease
        else if (currentVersion.isPrerelease) {
            newVersionString = this.bumpExistingPrerelease(currentVersion, preReleaseId);
        }
        // Case 4: Starting new prerelease from stable
        else {
            const defaultIdentifier = preReleaseId || "alpha";
            newVersionString = semver.inc(currentVersion.raw, "prerelease", defaultIdentifier);
        }

        if (!newVersionString) {
            return invalidErr({
                message: `Failed to bump prerelease version from '${currentVersion.raw}' with identifier '${preReleaseId}' and base '${preReleaseBase}'.`,
                source: "services/version-bumper",
            });
        }

        return Version.fromClean(newVersionString);
    }

    /**
     * Graduates a prerelease version to its stable counterpart.
     *
     * @param currentVersion - The current prerelease version
     * @returns The stable version
     */
    private graduatePrerelease(currentVersion: Version): FireflyResult<Version> {
        if (!currentVersion.isPrerelease) {
            return invalidErr({
                message: `Cannot graduate non-prerelease version '${currentVersion.raw}'. Only prerelease versions can be graduated.`,
                source: "services/version-bumper",
            });
        }

        const stableVersionResult = currentVersion.toStable();
        if (stableVersionResult.isErr()) {
            return FireflyErr(stableVersionResult.error);
        }

        return FireflyOk(stableVersionResult.value);
    }
}

/**
 * Creates a version bumper service instance.
 */
export function createVersionBumperService(): IVersionBumperService {
    return new DefaultVersionBumperService();
}
