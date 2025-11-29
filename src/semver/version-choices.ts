/**
 * Version Choices Service
 *
 * Generates version choice options for interactive prompts
 * based on the current version and release type.
 *
 * @module semver/version-choices
 */

import { Result } from "neverthrow";
import type { PreReleaseBase, ReleaseType } from "#/commands/release/config";
import { invalidError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyResult } from "#/utils/result";
import { FireflyErr, FireflyOk } from "#/utils/result";
import type { Version } from "./version";
import { type VersionBumpOptions, VersionManager } from "./version-manager";

/**
 * Represents a selectable version choice for prompts.
 */
export interface VersionChoice {
    readonly label: string;
    readonly value: string;
    readonly hint?: string;
}

/**
 * Arguments for generating version choices.
 */
export interface VersionChoicesArgs {
    readonly currentVersion: Version;
    readonly releaseType?: ReleaseType;
    readonly prereleaseIdentifier?: string;
    readonly prereleaseBase?: PreReleaseBase;
}

/**
 * Version type categories for organizing choices.
 */
const VERSION_TYPES = {
    RELEASE: ["patch", "minor", "major"] as const,
    PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
    CONTINUATION: ["prerelease"] as const,
    GRADUATION: ["graduate"] as const,
} as const;

/**
 * Pre-configured choice sets for different scenarios.
 */
const VERSION_CHOICES = {
    /** When current version is a prerelease */
    latestIsPreRelease: [...VERSION_TYPES.CONTINUATION, ...VERSION_TYPES.GRADUATION, ...VERSION_TYPES.RELEASE],
    /** When specifically requesting prerelease options */
    preRelease: VERSION_TYPES.PRERELEASE,
    /** Default stable version options */
    default: [...VERSION_TYPES.RELEASE, ...VERSION_TYPES.PRERELEASE],
} as const;

/**
 * Human-readable descriptions for each release type.
 */
const VERSION_DESCRIPTIONS: Readonly<Record<string, string>> = {
    patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
    minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
    major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
    prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
    preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
    premajor: "Unstable major release candidate. Used for testing breaking changes before a major release.",
    prerelease: "Unstable pre-release continuation. Increments the pre-release number or changes identifier.",
    graduate: "Promote pre-release to stable. Removes pre-release identifiers to create a stable version.",
};

/**
 * Generates version choices for interactive prompts.
 *
 * @example
 * ```ts
 * const result = createVersionChoices({
 *   currentVersion: Version.from("1.0.0").value,
 * });
 * // Returns choices for patch, minor, major, prepatch, etc.
 * ```
 */
export function createVersionChoices(options: VersionChoicesArgs): FireflyResult<VersionChoice[]> {
    logger.verbose(`[version-choices] Creating version choices for '${options.currentVersion.raw}'...`);

    const availableTypes = determineAvailableVersionTypes(options.currentVersion, options.releaseType);

    const choicesResults = availableTypes.map((releaseType) =>
        createVersionChoice({
            currentVersion: options.currentVersion,
            releaseType,
            prereleaseIdentifier: options.prereleaseIdentifier,
            prereleaseBase: options.prereleaseBase,
        })
    );

    const combinedResult = Result.combine(choicesResults);
    if (combinedResult.isErr()) {
        return FireflyErr(combinedResult.error);
    }

    logger.verbose(`[version-choices] Created ${combinedResult.value.length} version choices.`);
    return FireflyOk(combinedResult.value);
}

/**
 * Determines which version types are available based on current state.
 */
function determineAvailableVersionTypes(currentVersion: Version, releaseType?: ReleaseType): readonly ReleaseType[] {
    if (releaseType !== undefined) {
        return getVersionTypesForReleaseType(releaseType);
    }

    const isCurrentPreRelease = currentVersion.isPrerelease;
    return isCurrentPreRelease ? VERSION_CHOICES.latestIsPreRelease : VERSION_CHOICES.default;
}

/**
 * Gets appropriate version types for a specific release type filter.
 */
function getVersionTypesForReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
    return releaseType === "prerelease" ? VERSION_CHOICES.preRelease : VERSION_CHOICES.default;
}

/**
 * Creates a single version choice with computed version.
 */
function createVersionChoice(options: VersionChoicesArgs): FireflyResult<VersionChoice> {
    const newVersionResult = computeNewVersion(options);

    if (newVersionResult.isErr()) {
        return FireflyErr(newVersionResult.error);
    }

    const newVersion = newVersionResult.value;
    const releaseType = options.releaseType || "patch";

    const choice: VersionChoice = {
        label: `${releaseType} (${newVersion.raw})`,
        hint: getVersionDescription(releaseType),
        value: newVersion.raw,
    };

    return FireflyOk(choice);
}

/**
 * Computes the new version based on bump options.
 */
function computeNewVersion(options: VersionChoicesArgs): FireflyResult<Version> {
    if (!options.releaseType) {
        return FireflyErr(
            invalidError({
                message: "Release type is required to compute new version",
                source: "semver/version-choices",
            })
        );
    }

    const bumpOptions: VersionBumpOptions = {
        currentVersion: options.currentVersion,
        releaseType: options.releaseType,
        prereleaseIdentifier: options.prereleaseIdentifier,
        prereleaseBase: options.prereleaseBase,
    };

    return VersionManager.bumpVersion(bumpOptions);
}

/**
 * Gets the human-readable description for a release type.
 */
function getVersionDescription(releaseType: ReleaseType): string {
    return VERSION_DESCRIPTIONS[releaseType] ?? "";
}
