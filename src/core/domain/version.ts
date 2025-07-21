import semver from "semver";
import type { PreReleaseBase, ReleaseType } from "#/infrastructure/config/schema";
import { FireflyError } from "#/shared/utils/error";

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

    bumpPrerelease(identifier?: string, base?: PreReleaseBase): Version {
        let newVersion: string | null;

        // Case 1: Custom prerelease with complex identifier (e.g., "canary.abc123")
        // When identifier contains dots, treat as complete prerelease identifier
        if (identifier?.includes(".")) {
            // Bump using identifier without base (e.g., "1.0.0-canary.abc123")
            newVersion = semver.inc(this._version, "prerelease", identifier, false);
        }

        // Case 2: Bumping from stable to prerelease (or with simple identifier)
        else if (base !== undefined && base !== null) {
            const ensuredBase = this.ensureIdentifierBase(base);
            // Bump using identifier and base (e.g., "1.0.0-alpha.1" with base 0 or 1)
            newVersion = semver.inc(this._version, "prerelease", identifier, ensuredBase);
        }

        // Case 3: Continuation of existing prerelease
        else if (this.isPrerelease()) {
            if (identifier) {
                // Continue with specific identifier
                newVersion = semver.inc(this._version, "prerelease", identifier);
            } else {
                // Continue existing prerelease series (e.g., 1.0.0-alpha.1 -> 1.0.0-alpha.2)
                newVersion = semver.inc(this._version, "prerelease");
            }
        }

        // Case 4: Default behavior - start new prerelease from stable
        else {
            const defaultIdentifier = identifier || "alpha";
            newVersion = semver.inc(this._version, "prerelease", defaultIdentifier);
        }

        if (!newVersion) {
            throw new FireflyError(`Failed to bump prerelease ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPremajor(identifier?: string, base?: PreReleaseBase): Version {
        let newVersion: string | null;

        if (base !== undefined && base !== null) {
            const ensuredBase = this.ensureIdentifierBase(base);
            newVersion = semver.inc(this._version, "premajor", identifier, ensuredBase);
        } else {
            newVersion = semver.inc(this._version, "premajor", identifier);
        }

        if (!newVersion) {
            throw new FireflyError(`Failed to bump premajor ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPreminor(identifier?: string, base?: PreReleaseBase): Version {
        let newVersion: string | null;

        if (base !== undefined && base !== null) {
            const ensuredBase = this.ensureIdentifierBase(base);
            newVersion = semver.inc(this._version, "preminor", identifier, ensuredBase);
        } else {
            newVersion = semver.inc(this._version, "preminor", identifier);
        }

        if (!newVersion) {
            throw new FireflyError(`Failed to bump preminor ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    bumpPrepatch(identifier?: string, base?: PreReleaseBase): Version {
        let newVersion: string | null;

        if (base !== undefined && base !== null) {
            const ensuredBase = this.ensureIdentifierBase(base);
            newVersion = semver.inc(this._version, "prepatch", identifier, ensuredBase);
        } else {
            newVersion = semver.inc(this._version, "prepatch", identifier);
        }

        if (!newVersion) {
            throw new FireflyError(`Failed to bump prepatch ${this._version}`, "VERSION_BUMP_ERROR");
        }
        return new Version(newVersion);
    }

    private isPrerelease(): boolean {
        return semver.prerelease(this._version) !== null;
    }

    private ensureIdentifierBase(value: PreReleaseBase): "0" | "1" {
        return value === "0" || value === "1" ? value : "0";
    }
}
