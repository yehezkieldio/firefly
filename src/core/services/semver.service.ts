import type { ReleaseType } from "semver";
import type { PreReleaseBase } from "#/config/schema";
import type { Version } from "#/core/domain/version";
import { VersionError } from "#/shared/result";

export interface BumpVersionOptions {
    current: Version;
    increment: ReleaseType;
    preReleaseId?: string;
    preReleaseBase?: PreReleaseBase;
}

export function bumpVersion(options: BumpVersionOptions): Version {
    const { current, increment, preReleaseId, preReleaseBase } = options;

    switch (increment) {
        case "major":
        case "minor":
        case "patch":
            return current.bump(increment);

        case "premajor":
            return current.bumpPremajor(preReleaseId, preReleaseBase);
        case "preminor":
            return current.bumpPreminor(preReleaseId, preReleaseBase);
        case "prepatch":
            return current.bumpPrepatch(preReleaseId, preReleaseBase);
        case "prerelease":
            return current.bumpPrerelease(preReleaseId, preReleaseBase);

        default: {
            const _ = increment;
            throw new VersionError(`Unhandled semver increment: ${increment}`);
        }
    }
}
