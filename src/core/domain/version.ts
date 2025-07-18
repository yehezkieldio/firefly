import semver from "semver";
import { FireflyError } from "#/shared/result";

export class Version {
    private readonly _version: string;

    constructor(version: string) {
        const cleaned = semver.clean(version);
        if (!cleaned) {
            throw new FireflyError(`Invalid version: ${version}`, "INVALID_VERSION");
        }
        this._version = cleaned;
    }

    static fromString(version: string): Version {
        return new Version(version);
    }

    static current(): Version {
        return new Version("0.0.0");
    }

    toString(): string {
        return this._version;
    }

    toJSON(): string {
        return this._version;
    }

    get major(): number {
        return semver.major(this._version);
    }

    get minor(): number {
        return semver.minor(this._version);
    }

    get patch(): number {
        return semver.patch(this._version);
    }

    get prerelease(): ReadonlyArray<string | number> {
        return semver.prerelease(this._version) || [];
    }

    isPrerelease(): boolean {
        return this.prerelease.length > 0;
    }

    isGreaterThan(other: Version): boolean {
        return semver.gt(this._version, other._version);
    }

    isLessThan(other: Version): boolean {
        return semver.lt(this._version, other._version);
    }

    isEqualTo(other: Version): boolean {
        return semver.eq(this._version, other._version);
    }

    bump(release: "major" | "minor" | "patch" | "prerelease"): Version {
        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            throw new FireflyError(
                `Failed to bump version ${this._version} as ${release}`,
                "VERSION_BUMP_ERROR"
            );
        }
        return new Version(newVersion);
    }

    bumpPrerelease(identifier?: string): Version {
        const newVersion = semver.inc(this._version, "prerelease", identifier);
        if (!newVersion) {
            throw new FireflyError(
                `Failed to bump prerelease version ${this._version}`,
                "VERSION_BUMP_ERROR"
            );
        }
        return new Version(newVersion);
    }

    bumpPremajor(identifier?: string): Version {
        const newVersion = semver.inc(this._version, "premajor", identifier);
        if (!newVersion) {
            throw new FireflyError(`Failed to bump premajor version ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPreminor(identifier?: string): Version {
        const newVersion = semver.inc(this._version, "preminor", identifier);
        if (!newVersion) {
            throw new FireflyError(`Failed to bump preminor version ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPrepatch(identifier?: string): Version {
        const newVersion = semver.inc(this._version, "prepatch", identifier);
        if (!newVersion) {
            throw new FireflyError(`Failed to bump prepatch version ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }
}
