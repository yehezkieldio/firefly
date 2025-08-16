import { err, ok } from "neverthrow";
import semver from "semver";
import type { PreReleaseBase, ReleaseType } from "#/infrastructure/config/schema";
import { VersionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class Version {
    private readonly _version: string;

    private constructor(version: string) {
        this._version = version;
    }

    static create(version: string): FireflyResult<Version> {
        logger.verbose(`Version: Creating Version instance from string '${version}'...`);
        const cleaned = semver.clean(version);
        if (!cleaned) {
            return err(new VersionError(`Invalid version: ${version}`));
        }
        logger.verbose(`Version: Version string cleaned and valid: '${cleaned}'.`);
        return ok(new Version(cleaned));
    }

    toString(): string {
        return this._version;
    }

    bump(release: Extract<ReleaseType, "major" | "minor" | "patch" | "prerelease">): FireflyResult<Version> {
        logger.verbose(`Version: Bumping version '${this._version}' as '${release}'...`);
        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            return err(new VersionError(`Failed to bump ${this._version} as ${release}`));
        }
        logger.verbose(`Version: Bumped version is '${newVersion}'.`);
        return Version.create(newVersion);
    }

    bumpPrerelease(identifier?: string, base?: PreReleaseBase): FireflyResult<Version> {
        logger.verbose(
            `Version: Bumping prerelease for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        let newVersion: string | null = null;

        // Case 1: Custom prerelease with complex identifier (e.g., "canary.abc123")
        // When identifier contains dots, treat as complete prerelease identifier
        if (this.isComplexIdentifier(identifier)) {
            newVersion = this.bumpWithComplexIdentifier(identifier);
        }
        // Case 2: Bumping from stable to prerelease (or with simple identifier)
        else if (base !== undefined && base !== null) {
            const baseResult = this.ensureIdentifierBase(base);
            if (baseResult.isErr()) {
                return err(new VersionError(`Invalid prerelease base: ${base} for identifier: ${identifier}`));
            }

            newVersion = semver.inc(this._version, "prerelease", identifier, baseResult.value);
        }

        // Case 3: Continuation of existing prerelease
        else if (this.isPrerelease()) {
            newVersion = this.bumpExistingPrerelease(identifier);
        }

        // Case 4: Default behavior - start new prerelease from stable
        else {
            // Default: start new prerelease from stable
            const defaultIdentifier = identifier || "alpha";
            newVersion = semver.inc(this._version, "prerelease", defaultIdentifier);
        }

        if (!newVersion) {
            return err(
                new VersionError(
                    `Failed to bump ${this._version} as prerelease (identifier: ${identifier}, base: ${base})`,
                ),
            );
        }
        logger.verbose(`Version: Bumped prerelease version is '${newVersion}'.`);
        return Version.create(newVersion);
    }

    bumpPremajor(identifier?: string, base?: PreReleaseBase): FireflyResult<Version> {
        logger.verbose(
            `Version: Bumping premajor for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("premajor", identifier, base);
    }

    bumpPreminor(identifier?: string, base?: PreReleaseBase): FireflyResult<Version> {
        logger.verbose(
            `Version: Bumping preminor for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("preminor", identifier, base);
    }

    bumpPrepatch(identifier?: string, base?: PreReleaseBase): FireflyResult<Version> {
        logger.verbose(
            `Version: Bumping prepatch for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("prepatch", identifier, base);
    }

    private isPrerelease(): boolean {
        return semver.prerelease(this._version) !== null;
    }

    private isComplexIdentifier(identifier?: string): boolean {
        return Boolean(identifier) && identifier.includes(".");
    }

    private bumpWithComplexIdentifier(identifier?: string): string | null {
        return semver.inc(this._version, "prerelease", identifier, false);
    }

    private bumpExistingPrerelease(identifier?: string): string | null {
        if (identifier) {
            return semver.inc(this._version, "prerelease", identifier);
        }
        return semver.inc(this._version, "prerelease");
    }

    private bumpPre(
        type: "premajor" | "preminor" | "prepatch",
        identifier?: string,
        base?: PreReleaseBase,
    ): FireflyResult<Version> {
        logger.verbose(
            `Version: Bumping ${type} for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        let newVersion: string | null = null;

        if (base !== undefined && base !== null) {
            const baseResult = this.ensureIdentifierBase(base);
            if (baseResult.isErr()) {
                return err(
                    new VersionError(`Invalid prerelease base: ${base} for ${type} (identifier: ${identifier})`),
                );
            }
            newVersion = semver.inc(this._version, type, identifier, baseResult.value);
        } else {
            newVersion = semver.inc(this._version, type, identifier);
        }

        if (!newVersion) {
            return err(
                new VersionError(`Failed to bump ${type} ${this._version} (identifier: ${identifier}, base: ${base})`),
            );
        }

        logger.verbose(`Version: Bumped ${type} version is '${newVersion}'.`);
        return Version.create(newVersion);
    }

    private ensureIdentifierBase(value: PreReleaseBase): FireflyResult<"0" | "1"> {
        if (value === "0" || value === "1") {
            return ok(value);
        }
        return err(new VersionError(`Invalid prerelease base: ${value}`));
    }
}
