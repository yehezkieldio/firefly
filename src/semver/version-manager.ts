/**
 * Version Manager Service
 *
 * Provides version bumping operations using semantic versioning rules.
 * Supports standard releases, pre-releases, and graduation.
 *
 * @module semver/version-manager
 */

import semver from "semver";
import type { PreReleaseBase, ReleaseType } from "#/commands/release/config";
import { invalidError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";
import { FireflyErr, FireflyOk } from "#/utils/result";
import { Version } from "./version";

export interface VersionBumpOptions {
    readonly currentVersion: Version;
    readonly releaseType: ReleaseType;
    readonly prereleaseIdentifier?: string;
    readonly prereleaseBase?: PreReleaseBase;
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

function normalizeBase(base?: PreReleaseBase): FireflyResult<"0" | "1" | undefined> {
    if (base === undefined || base === null) {
        return FireflyOk(undefined);
    }

    if (base === "0" || base === "1") {
        return FireflyOk(base);
    }

    if (typeof base === "number" && (base === 0 || base === 1)) {
        return FireflyOk(base.toString() as "0" | "1");
    }

    return FireflyErr(
        invalidError({
            message: `Invalid prerelease base '${base}'. Must be "0", "1", 0, or 1.`,
            source: "semver/version-manager",
        })
    );
}

function isComplexIdentifier(identifier?: string): boolean {
    return typeof identifier === "string" && identifier.includes(".");
}

function bumpWithComplexIdentifier(currentVersion: Version, identifier?: string): string | null {
    if (!identifier) {
        return semver.inc(currentVersion.raw, "prerelease", undefined, "0");
    }
    return semver.inc(currentVersion.raw, "prerelease", identifier, false);
}

function bumpExistingPrerelease(currentVersion: Version, identifier?: string): string | null {
    return identifier
        ? semver.inc(currentVersion.raw, "prerelease", identifier)
        : semver.inc(currentVersion.raw, "prerelease");
}

function bumpStandard(currentVersion: Version, releaseType: "major" | "minor" | "patch"): FireflyResult<Version> {
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
        return FireflyErr(
            invalidError({
                message: `Failed to bump ${releaseType} version from '${baseVersionString}'.`,
                source: "semver/version-manager",
            })
        );
    }

    return Version.fromClean(newVersionString);
}

function bumpPreStandard(
    currentVersion: Version,
    releaseType: "premajor" | "preminor" | "prepatch",
    identifier?: string,
    base?: PreReleaseBase
): FireflyResult<Version> {
    const normalizedBaseResult = normalizeBase(base);
    if (normalizedBaseResult.isErr()) {
        return FireflyErr(normalizedBaseResult.error);
    }

    const normalizedBase = normalizedBaseResult.value;
    let newVersionString: string | null = null;

    if (normalizedBase !== undefined) {
        newVersionString = identifier
            ? semver.inc(currentVersion.raw, releaseType, identifier, normalizedBase)
            : semver.inc(currentVersion.raw, releaseType, undefined, normalizedBase);
    } else {
        newVersionString = identifier
            ? semver.inc(currentVersion.raw, releaseType, identifier)
            : semver.inc(currentVersion.raw, releaseType);
    }

    if (!newVersionString) {
        return FireflyErr(
            invalidError({
                message: `Failed to bump ${releaseType} version from '${currentVersion.raw}' with identifier '${identifier}' and base '${base}'.`,
                source: "semver/version-manager",
            })
        );
    }

    return Version.fromClean(newVersionString);
}

function bumpPrerelease(currentVersion: Version, identifier?: string, base?: PreReleaseBase): FireflyResult<Version> {
    let newVersionString: string | null = null;

    // Case 1: Complex identifier with dots (e.g., "canary.abc123")
    if (isComplexIdentifier(identifier)) {
        newVersionString = bumpWithComplexIdentifier(currentVersion, identifier);
    }

    // Case 2: Explicit base provided
    else if (base !== undefined && base !== null) {
        const normalizedBaseResult = normalizeBase(base);
        if (normalizedBaseResult.isErr()) {
            return FireflyErr(normalizedBaseResult.error);
        }

        const normalizedBase = normalizedBaseResult.value;
        newVersionString = identifier
            ? semver.inc(currentVersion.raw, "prerelease", identifier, normalizedBase)
            : semver.inc(currentVersion.raw, "prerelease", undefined, normalizedBase);
    }

    // Case 3: Continuing existing prerelease
    else if (currentVersion.isPrerelease) {
        newVersionString = bumpExistingPrerelease(currentVersion, identifier);
    }

    // Case 4: Starting new prerelease from stable
    else {
        const defaultIdentifier = identifier || "alpha";
        newVersionString = semver.inc(currentVersion.raw, "prerelease", defaultIdentifier);
    }

    if (!newVersionString) {
        return FireflyErr(
            invalidError({
                message: `Failed to bump prerelease version from '${currentVersion.raw}' with identifier '${identifier}' and base '${base}'.`,
                source: "semver/version-manager",
            })
        );
    }

    return Version.fromClean(newVersionString);
}

function graduatePrerelease(currentVersion: Version): FireflyResult<Version> {
    if (!currentVersion.isPrerelease) {
        return FireflyErr(
            invalidError({
                message: `Cannot graduate non-prerelease version '${currentVersion.raw}'. Only prerelease versions can be graduated.`,
                source: "semver/version-manager",
            })
        );
    }

    const stableVersionResult = currentVersion.toStable();
    if (stableVersionResult.isErr()) {
        return FireflyErr(stableVersionResult.error);
    }

    return FireflyOk(stableVersionResult.value);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Version Manager namespace containing version bumping operations.
 *
 * @example
 * ```ts
 * const result = VersionManager.bumpVersion({
 *   currentVersion: Version.from("1.0.0").value,
 *   releaseType: "minor",
 * });
 * // Result: "1.1.0"
 * ```
 */
export const VersionManager = {
    /**
     * Bumps a version according to the specified release type.
     */
    bumpVersion(options: VersionBumpOptions): FireflyResult<Version> {
        const { currentVersion, releaseType, prereleaseIdentifier, prereleaseBase } = options;

        if (releaseType === "major" || releaseType === "minor" || releaseType === "patch") {
            return bumpStandard(currentVersion, releaseType);
        }

        if (releaseType === "premajor" || releaseType === "preminor" || releaseType === "prepatch") {
            return bumpPreStandard(currentVersion, releaseType, prereleaseIdentifier, prereleaseBase);
        }

        if (releaseType === "prerelease") {
            return bumpPrerelease(currentVersion, prereleaseIdentifier, prereleaseBase);
        }

        if (releaseType === "graduate") {
            return graduatePrerelease(currentVersion);
        }

        return FireflyErr(
            invalidError({
                message: `Unsupported release type: ${releaseType}`,
                source: "semver/version-manager",
            })
        );
    },
} as const;
