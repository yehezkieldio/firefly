import { err } from "neverthrow";
import type { ReleaseType } from "semver";
import type { Version } from "#/core/domain/version";
import type { PreReleaseBase } from "#/infrastructure/config/schema";
import { VersionError } from "#/shared/utils/error.util";
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

export class SemverService {
    bump(options: BumpVersionOptions): FireflyResult<Version> {
        const { currentVersion, releaseType, preReleaseId, preReleaseBase } = options;

        switch (releaseType) {
            case "major":
            case "minor":
            case "patch":
                return currentVersion.bump(releaseType);

            case "premajor":
                return currentVersion.bumpPremajor(preReleaseId, preReleaseBase);
            case "preminor":
                return currentVersion.bumpPreminor(preReleaseId, preReleaseBase);
            case "prepatch":
                return currentVersion.bumpPrepatch(preReleaseId, preReleaseBase);
            case "prerelease":
                return currentVersion.bumpPrerelease(preReleaseId, preReleaseBase);

            default: {
                return err(new VersionError(`Unhandled semver increment: ${releaseType}`));
            }
        }
    }
}
