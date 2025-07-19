import semver from "semver";
import type { PreReleaseBase, ReleaseType } from "#/config/schema";
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

    toString(): string {
        return this._version;
    }

    bump(release: Extract<ReleaseType, "major" | "minor" | "patch" | "prerelease">): Version {
        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            throw new FireflyError(`Failed to bump ${this._version} as ${release}`, "VERSION_BUMP_ERROR");
        }

        return new Version(newVersion);
    }

    bumpPrerelease(identifier: string, _base: PreReleaseBase = 0): Version {
        const base = this.ensureIdentifierBase(_base);

        const newVersion = semver.inc(this._version, "prerelease", identifier, base);

        if (!newVersion) {
            throw new FireflyError(`Failed to bump prerelease ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPremajor(identifier: string, _base: PreReleaseBase = 0): Version {
        const base = this.ensureIdentifierBase(_base);

        const newVersion = semver.inc(this._version, "premajor", identifier, base);

        if (!newVersion) {
            throw new FireflyError(`Failed to bump premajor ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPreminor(identifier: string, _base: PreReleaseBase = 0): Version {
        const base = this.ensureIdentifierBase(_base);

        const newVersion = semver.inc(this._version, "preminor", identifier, base);

        if (!newVersion) {
            throw new FireflyError(`Failed to bump preminor ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPrepatch(identifier: string, _base: PreReleaseBase = 0): Version {
        const base = this.ensureIdentifierBase(_base);

        const newVersion = semver.inc(this._version, "prepatch", identifier, base);

        if (!newVersion) {
            throw new FireflyError(`Failed to bump prepatch ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    private ensureIdentifierBase(value: PreReleaseBase): "0" | "1" {
        return value === "0" || value === "1" ? value : "0";
    }
}
