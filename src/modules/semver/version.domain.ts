import { err, ok } from "neverthrow";
import semver, { type ReleaseType } from "semver";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class VersionDomain {
    private readonly _version: string;

    private constructor(version: string) {
        this._version = version;
    }

    static create(version: string): FireflyResult<VersionDomain> {
        const cleanedVersion = semver.clean(version);
        if (!cleanedVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `The version string "${version}" is not a valid semantic version.`,
                    source: "semver/version-domain",
                }),
            );
        }

        return ok(new VersionDomain(cleanedVersion));
    }

    bump(release: Extract<ReleaseType, "major" | "minor" | "patch" | "prerelease">): FireflyResult<VersionDomain> {
        logger.verbose(`VersionDomain: Bumping version ${this._version} with release type ${release}`);
        const newVersion = semver.inc(this._version, release);
        if (!newVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Failed to bump version "${this._version}" with release type "${release}".`,
                    source: "semver/version-domain",
                }),
            );
        }
        return VersionDomain.create(newVersion);
    }
}
