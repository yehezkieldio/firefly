import { err } from "neverthrow";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import type { Version } from "#/modules/semver/version.domain";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface BumpVersionOptions {
    currentVersion: Version;
    releaseType?: ReleaseType;
    preReleaseId?: string;
    preReleaseBase?: PreReleaseBase;
}

export type VersionChoicesArgs = Omit<BumpVersionOptions, "currentVersion"> & {
    currentVersion: string;
};

export class BumpVersionService {
    static bump(options: BumpVersionOptions): FireflyResult<Version> {
        const { currentVersion, releaseType } = options;

        switch (releaseType) {
            case "major":
            case "minor":
            case "patch":
                return currentVersion.bump(releaseType);
            default:
                return err(
                    createFireflyError({
                        code: "UNEXPECTED",
                        message: `BumpVersionService: Unsupported release type '${releaseType}'.`,
                    }),
                );
        }
    }
}
