import type { BumperRecommendation } from "conventional-recommended-bump";
import type { ReleaseType } from "semver";
import { Version } from "#/core/domain/version";
import { bumpVersion } from "#/core/services/semver.service";

export class VersionDecider {
    private readonly currentVersion: Version;
    private readonly preReleaseId?: string;

    constructor(currentVersion: string, preReleaseId?: string) {
        this.currentVersion = new Version(currentVersion);
        this.preReleaseId = preReleaseId;
    }

    decide(releaseType: ReleaseType, recommendation: BumperRecommendation): string {
        if (releaseType === "prerelease") {
            return this.createPreRelease();
        }

        const conventionalReleaseType = this.mapToConventionalRelease(recommendation.level);
        return this.createRelease(conventionalReleaseType);
    }

    private mapToConventionalRelease(level: number): ReleaseType {
        const mapping: Record<number, ReleaseType> = {
            0: "major",
            1: "minor",
            2: "patch",
        };

        return mapping[level] ?? "patch";
    }

    private createPreRelease(): string {
        return bumpVersion({
            current: this.currentVersion,
            increment: "prerelease",
        }).toString();
    }

    private createRelease(releaseType: ReleaseType): string {
        return bumpVersion({
            current: this.currentVersion,
            increment: releaseType,
            preReleaseId: this.preReleaseId,
        }).toString();
    }
}
