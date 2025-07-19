import type { ReleaseType } from "semver";
import type { Version } from "#/core/domain/version";
import { VersionError } from "#/shared/result";

export interface BumpVersionOptions {
    current: Version;
    increment: ReleaseType;
    preReleaseId?: string;
    preReleaseBase?: string | number;
}

export function bumpVersion(options: BumpVersionOptions): Version {
    const { current, increment, preReleaseId, preReleaseBase } = options;

    switch (increment) {
        case "major":
        case "minor":
        case "patch":
            return current.bump(increment);

        case "premajor":
            return current.bumpPremajor(preReleaseId, preReleaseBase?.toString());
        case "preminor":
            return current.bumpPreminor(preReleaseId, preReleaseBase?.toString());
        case "prepatch":
            return current.bumpPrepatch(preReleaseId, preReleaseBase?.toString());
        case "prerelease":
            return current.bumpPrerelease(preReleaseId, preReleaseBase?.toString());

        default: {
            const _ = increment;
            throw new VersionError(`Unhandled semver increment: ${increment}`);
        }
    }
}
