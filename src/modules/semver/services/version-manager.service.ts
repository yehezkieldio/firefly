import { err, ok } from "neverthrow";
import semver from "semver";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import { Version } from "#/modules/semver/version.domain";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface VersionBumpOptions {
    currentVersion: Version;
    releaseType: ReleaseType;
    prereleaseIdentifier?: string;
    prereleaseBase?: PreReleaseBase;
}

export class VersionManager {
    static bumpVersion(options: VersionBumpOptions): FireflyResult<Version> {
        const { currentVersion, releaseType, prereleaseIdentifier, prereleaseBase } = options;

        if (releaseType === "major" || releaseType === "minor" || releaseType === "patch") {
            return VersionManager.bumpStandard(currentVersion, releaseType);
        }

        if (releaseType === "premajor" || releaseType === "preminor" || releaseType === "prepatch") {
            return VersionManager.bumpPreStandard(currentVersion, releaseType, prereleaseIdentifier, prereleaseBase);
        }

        if (releaseType === "prerelease") {
            return VersionManager.bumpPrerelease(currentVersion, prereleaseIdentifier, prereleaseBase);
        }

        if (releaseType === "graduate") {
            return VersionManager.graduatePrerelease(currentVersion);
        }

        return err(
            createFireflyError({
                code: "INVALID",
                message: `Unsupported release type: ${releaseType}`,
            }),
        );
    }

    private static bumpStandard(
        currentVersion: Version,
        releaseType: "major" | "minor" | "patch",
    ): FireflyResult<Version> {
        const newVersionString = semver.inc(currentVersion.raw, releaseType);

        if (!newVersionString) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump ${releaseType} version from '${currentVersion.raw}'.`,
                }),
            );
        }

        return Version.fromClean(newVersionString);
    }

    private static bumpPreStandard(
        currentVersion: Version,
        releaseType: "premajor" | "preminor" | "prepatch",
        identifier?: string,
        base?: PreReleaseBase,
    ): FireflyResult<Version> {
        const normalizedBaseResult = VersionManager.normalizeBase(base);
        if (normalizedBaseResult.isErr()) {
            return err(normalizedBaseResult.error);
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
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump ${releaseType} version from '${currentVersion.raw}' with identifier '${identifier}' and base '${base}'.`,
                }),
            );
        }

        return Version.fromClean(newVersionString);
    }

    private static bumpPrerelease(
        currentVersion: Version,
        identifier?: string,
        base?: PreReleaseBase,
    ): FireflyResult<Version> {
        let newVersionString: string | null = null;

        // Case 1: Complex identifier with dots (e.g., "canary.abc123")
        if (VersionManager.isComplexIdentifier(identifier)) {
            newVersionString = VersionManager.bumpWithComplexIdentifier(currentVersion, identifier);
        }

        // Case 2: Explicit base provided
        else if (base !== undefined && base !== null) {
            const normalizedBaseResult = VersionManager.normalizeBase(base);
            if (normalizedBaseResult.isErr()) {
                return err(normalizedBaseResult.error);
            }

            const normalizedBase = normalizedBaseResult.value;
            newVersionString = identifier
                ? semver.inc(currentVersion.raw, "prerelease", identifier, normalizedBase)
                : semver.inc(currentVersion.raw, "prerelease", undefined, normalizedBase);
        }

        // Case 3: Continuing existing prerelease
        else if (currentVersion.isPrerelease) {
            newVersionString = VersionManager.bumpExistingPrerelease(currentVersion, identifier);
        }

        // Case 4: Starting new prerelease from stable
        else {
            const defaultIdentifier = identifier || "alpha";
            newVersionString = semver.inc(currentVersion.raw, "prerelease", defaultIdentifier);
        }

        if (!newVersionString) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump prerelease version from '${currentVersion.raw}' with identifier '${identifier}' and base '${base}'.`,
                }),
            );
        }

        return Version.fromClean(newVersionString);
    }

    private static graduatePrerelease(currentVersion: Version): FireflyResult<Version> {
        if (!currentVersion.isPrerelease) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Cannot graduate non-prerelease version '${currentVersion.raw}'. Only prerelease versions can be graduated.`,
                }),
            );
        }

        const stableVersionResult = currentVersion.toStable();
        if (stableVersionResult.isErr()) {
            return err(stableVersionResult.error);
        }

        const stableVersion = stableVersionResult.value;
        return ok(stableVersion);
    }

    private static normalizeBase(base?: PreReleaseBase): FireflyResult<"0" | "1" | undefined> {
        if (base === undefined || base === null) {
            return ok(undefined);
        }

        if (base === "0" || base === "1") {
            return ok(base);
        }

        if (typeof base === "number" && (base === 0 || base === 1)) {
            return ok(base.toString() as "0" | "1");
        }

        return err(
            createFireflyError({
                code: "INVALID",
                message: `Invalid prerelease base '${base}'. Must be "0", "1", 0, or 1.`,
            }),
        );
    }

    private static isComplexIdentifier(identifier?: string): boolean {
        return typeof identifier === "string" && identifier.includes(".");
    }

    private static bumpWithComplexIdentifier(currentVersion: Version, identifier?: string): string | null {
        if (!identifier) {
            return semver.inc(currentVersion.raw, "prerelease", undefined, "0");
        }
        return semver.inc(currentVersion.raw, "prerelease", identifier, false);
    }

    private static bumpExistingPrerelease(currentVersion: Version, identifier?: string): string | null {
        return identifier
            ? semver.inc(currentVersion.raw, "prerelease", identifier)
            : semver.inc(currentVersion.raw, "prerelease");
    }
}
