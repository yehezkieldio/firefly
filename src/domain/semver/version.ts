import semver from "semver";
import { FireflyOk, invalidErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";

/**
 * Represents a parsed semantic version with immutable access.
 *
 * @example
 * ```ts
 * const result = Version.from("1.2.3-alpha.1");
 * if (result.isOk()) {
 *   console.log(result.value.major); // 1
 *   console.log(result.value.isPrerelease); // true
 * }
 * ```
 */
export class Version {
    private readonly _raw: string;
    private readonly _parsed: semver.SemVer;

    private constructor(version: string, parsed: semver.SemVer) {
        this._raw = version;
        this._parsed = parsed;
    }

    /**
     * Creates a Version from any valid semver string.
     * Handles cleaning (removing 'v' prefix, etc.).
     */
    static from(input: string): FireflyResult<Version> {
        const cleaned = semver.clean(input);
        if (!cleaned) {
            return invalidErr({
                message: `"${input}" is not a valid semantic version.`,
            });
        }

        const parsed = semver.parse(cleaned);
        if (!parsed) {
            return invalidErr({
                message: `Failed to parse semantic version "${cleaned}".`,
            });
        }

        return FireflyOk(new Version(cleaned, parsed));
    }

    /**
     * Creates a Version from an already-clean semver string.
     * Use when you know the input is already normalized.
     */
    static fromClean(cleanVersion: string): FireflyResult<Version> {
        const parsed = semver.parse(cleanVersion);
        if (!parsed) {
            return invalidErr({
                message: `Expected clean version but got invalid: ${cleanVersion}`,
            });
        }
        return FireflyOk(new Version(cleanVersion, parsed));
    }

    /**
     * The raw version string.
     */
    get raw(): string {
        return this._raw;
    }

    /**
     * Major version number.
     */
    get major(): number {
        return this._parsed.major;
    }

    /**
     * Minor version number.
     */
    get minor(): number {
        return this._parsed.minor;
    }

    /**
     * Patch version number.
     */
    get patch(): number {
        return this._parsed.patch;
    }

    /**
     * Whether this version has prerelease identifiers.
     */
    get isPrerelease(): boolean {
        return this._parsed.prerelease.length > 0;
    }

    /**
     * Prerelease identifiers (e.g., ["alpha", 1] for "1.0.0-alpha.1").
     */
    get prerelease(): readonly (string | number)[] {
        return this._parsed.prerelease;
    }

    /**
     * The prerelease identifier (e.g., "alpha" from "1.0.0-alpha.1").
     */
    get preReleaseId(): string | null {
        if (!this.isPrerelease) return null;
        const first = this._parsed.prerelease[0];
        return typeof first === "string" ? first : null;
    }

    /**
     * The prerelease number (e.g., 1 from "1.0.0-alpha.1").
     */
    get prereleaseNumber(): number | null {
        if (!this.isPrerelease) return null;
        const last = this._parsed.prerelease.at(-1);
        return typeof last === "number" ? last : null;
    }

    /**
     * Build metadata identifiers.
     */
    get build(): readonly string[] {
        return this._parsed.build;
    }

    /**
     * Returns the raw version string.
     */
    toString(): string {
        return this._raw;
    }

    /**
     * Checks equality with another Version.
     *
     * @param other - The other Version to compare with
     * @returns True if equal, false otherwise
     */
    equals(other: Version): boolean {
        return semver.eq(this._raw, other._raw);
    }

    /**
     * Compares with another Version: -1 (less), 0 (equal), 1 (greater).
     *
     * @param other - The other Version to compare with
     * @returns -1, 0, or 1 based on comparison
     */
    compare(other: Version): -1 | 0 | 1 {
        return semver.compare(this._raw, other._raw);
    }

    /**
     * Checks if this version is greater than another.
     *
     * @param other - The other Version to compare with
     * @returns True if this version is greater, false otherwise
     */
    isGreaterThan(other: Version): boolean {
        return semver.gt(this._raw, other._raw);
    }

    /**
     * Checks if this version is less than another.
     *
     * @param other - The other Version to compare with
     * @returns True if this version is less, false otherwise
     */
    isLessThan(other: Version): boolean {
        return semver.lt(this._raw, other._raw);
    }

    /**
     * Checks if this version satisfies a semver range.
     *
     * @param range - The semver range to check against
     * @returns True if it satisfies the range, false otherwise
     */
    satisfies(range: string): boolean {
        return semver.satisfies(this._raw, range);
    }

    /**
     * Converts a prerelease version to its stable form.
     * "1.2.3-alpha.1" → "1.2.3"
     */
    toStable(): FireflyResult<Version> {
        const stableVersion = `${this.major}.${this.minor}.${this.patch}`;
        return Version.fromClean(stableVersion);
    }
}
