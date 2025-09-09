import { err, ok } from "neverthrow";
import semver from "semver";
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

    toString(): string {
        return this._version;
    }
}
