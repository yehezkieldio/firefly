import { err, ok } from "neverthrow";
import semver from "semver";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class Version {
    static clean(version: string): FireflyResult<string> {
        const cleaned = semver.clean(version);

        if (!cleaned) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `The version "${version}" is not a valid semver version.`,
                }),
            );
        }

        return ok(cleaned);
    }

    private readonly _version: string;

    constructor(version: string) {
        this._version = version;
    }

    bump(release: Extract<ReleaseType, "major" | "minor" | "patch" | "prerelease">): FireflyResult<string> {
        logger.verbose(`Version: Bumping version '${this._version}' as '${release}'...`);
        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump version "${this._version}" as "${release}".`,
                }),
            );
        }
        logger.verbose(`Version: Bumped version is '${newVersion}'.`);
        return ok(newVersion);
    }

    bumpPrerelease(identifier?: string, base?: PreReleaseBase): FireflyResult<string> {
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
                return err(baseResult.error);
            }

            if (identifier !== undefined) {
                newVersion = semver.inc(this._version, "prerelease", identifier, baseResult.value);
            } else {
                newVersion = semver.inc(this._version, "prerelease", undefined, baseResult.value);
            }
        }

        // Case 3: Continuation of existing prerelease
        else if (Version.isPrerelease(this._version)) {
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
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump version "${this._version}" as prerelease (identifier: "${identifier}", base: "${base}").`,
                }),
            );
        }
        logger.verbose(`Version: Bumped prerelease version is '${newVersion}'.`);
        return ok(newVersion);
    }

    bumpPremajor(identifier?: string, base?: PreReleaseBase): FireflyResult<string> {
        logger.verbose(
            `Version: Bumping premajor for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("premajor", identifier, base);
    }

    bumpPreminor(identifier?: string, base?: PreReleaseBase): FireflyResult<string> {
        logger.verbose(
            `Version: Bumping preminor for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("preminor", identifier, base);
    }

    bumpPrepatch(identifier?: string, base?: PreReleaseBase): FireflyResult<string> {
        logger.verbose(
            `Version: Bumping prepatch for version '${this._version}' (identifier: '${identifier}', base: '${base}')...`,
        );
        return this.bumpPre("prepatch", identifier, base);
    }

    private static isPrerelease(version: string): boolean {
        return semver.prerelease(version) !== null;
    }

    private isComplexIdentifier(identifier?: string): boolean {
        return typeof identifier === "string" && identifier.includes(".");
    }

    private bumpWithComplexIdentifier(identifier?: string): string | null {
        if (!identifier) {
            return semver.inc(this._version, "prerelease", undefined, "0");
        }

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
    ): FireflyResult<string> {
        logger.verbose(`Bumping version with type "${type}", identifier "${identifier}", base "${base}"`);
        let newVersion: string | null = null;

        if (base !== undefined && base !== null) {
            const baseResult = this.ensureIdentifierBase(base);
            if (baseResult.isErr()) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: `Failed to bump version "${this._version}" with type "${type}", identifier "${identifier}", base "${base}".`,
                    }),
                );
            }

            if (identifier !== undefined) {
                newVersion = semver.inc(this._version, type, identifier, baseResult.value);
            } else {
                newVersion = semver.inc(this._version, type, undefined, baseResult.value);
            }
        } else if (identifier !== undefined) {
            newVersion = semver.inc(this._version, type, identifier);
        } else {
            newVersion = semver.inc(this._version, type);
        }

        if (!newVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump version "${this._version}" with type "${type}", identifier "${identifier}", base "${base}".`,
                }),
            );
        }

        return ok(newVersion);
    }

    private ensureIdentifierBase(value: PreReleaseBase): FireflyResult<"0" | "1"> {
        if (value === "0" || value === "1") {
            return ok(value);
        }

        return err(
            createFireflyError({
                code: "INVALID",
                message: `The pre-release base "${value}" is not valid. It must be "0" or "1".`,
            }),
        );
    }
}
