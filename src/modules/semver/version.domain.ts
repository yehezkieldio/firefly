import { err, ok } from "neverthrow";
import semver from "semver";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
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
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Version: Invalid version string provided: '${version}'.`,
                    source: "semver/version-domain",
                }),
            );
        }

        logger.verbose(`Version: Version string cleaned and valid: '${cleaned}'.`);
        return ok(new Version(cleaned));
    }

    static isPreRelease(version: string): boolean {
        return semver.prerelease(version) !== null;
    }

    toString(): string {
        return this._version;
    }

    bump(release: Extract<ReleaseType, "major" | "minor" | "patch" | "prerelease">): FireflyResult<Version> {
        logger.verbose(`Version: Bumping version '${this._version}' as '${release}'...`);

        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Version: Failed to bump version '${this._version}' as '${release}'.`,
                }),
            );
        }

        logger.verbose(`Version: Bumped version is '${newVersion}'.`);
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
                    createFireflyError({
                        code: "INVALID",
                        message: `Version: Invalid prerelease base: ${base} for ${type} (identifier: ${identifier}).`,
                        source: "semver/version-domain",
                    }),
                );
            }
            newVersion = semver.inc(this._version, type, identifier, baseResult.value);
        } else {
            newVersion = semver.inc(this._version, type, identifier);
        }

        if (!newVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Version: Failed to bump ${type} for version '${this._version}' (identifier: '${identifier}', base: '${base}').`,
                    source: "semver/version-domain",
                }),
            );
        }

        logger.verbose(`Version: Bumped ${type} version is '${newVersion}'.`);
        return Version.create(newVersion);
    }

    private ensureIdentifierBase(value: PreReleaseBase): FireflyResult<"0" | "1"> {
        if (value === "0" || value === "1") {
            return ok(value);
        }
        return err(
            createFireflyError({
                code: "INVALID",
                message: `Version: Invalid prerelease base: ${value}.`,
                source: "semver/version-domain",
            }),
        );
    }
}
