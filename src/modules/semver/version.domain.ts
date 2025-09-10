import { err, ok } from "neverthrow";
import semver from "semver";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class Version {
    private readonly _raw: string;
    private readonly _parsed: semver.SemVer;

    private constructor(version: string, parsed: semver.SemVer) {
        this._raw = version;
        this._parsed = parsed;
    }

    static from(input: string): FireflyResult<Version> {
        const cleaned = semver.clean(input);
        if (!cleaned) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `"${input}" is not a valid semantic version.`,
                }),
            );
        }

        const parsed = semver.parse(cleaned);
        if (!parsed) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to parse semantic version "${cleaned}".`,
                }),
            );
        }

        return ok(new Version(cleaned, parsed));
    }

    static fromClean(cleanVersion: string): FireflyResult<Version> {
        const parsed = semver.parse(cleanVersion);
        if (!parsed) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Expected clean version but got invalid: ${cleanVersion}`,
                }),
            );
        }
        return ok(new Version(cleanVersion, parsed));
    }

    get raw(): string {
        return this._raw;
    }
    get major(): number {
        return this._parsed.major;
    }
    get minor(): number {
        return this._parsed.minor;
    }
    get patch(): number {
        return this._parsed.patch;
    }

    get isPrerelease(): boolean {
        return this._parsed.prerelease.length > 0;
    }
    get prerelease(): readonly (string | number)[] {
        return this._parsed.prerelease;
    }

    get prereleaseIdentifier(): string | null {
        if (!this.isPrerelease) return null;
        const first = this._parsed.prerelease[0];
        return typeof first === "string" ? first : null;
    }

    get prereleaseNumber(): number | null {
        if (!this.isPrerelease) return null;
        const last = this._parsed.prerelease.at(-1);
        return typeof last === "number" ? last : null;
    }

    get build(): readonly string[] {
        return this._parsed.build;
    }

    toString(): string {
        return this._raw;
    }

    equals(other: Version): boolean {
        return semver.eq(this._raw, other._raw);
    }

    compare(other: Version): -1 | 0 | 1 {
        return semver.compare(this._raw, other._raw);
    }

    isGreaterThan(other: Version): boolean {
        return semver.gt(this._raw, other._raw);
    }

    isLessThan(other: Version): boolean {
        return semver.lt(this._raw, other._raw);
    }

    satisfies(range: string): boolean {
        return semver.satisfies(this._raw, range);
    }

    toStable(): FireflyResult<Version> {
        const stableVersion = `${this.major}.${this.minor}.${this.patch}`;
        return Version.fromClean(stableVersion);
    }
}
