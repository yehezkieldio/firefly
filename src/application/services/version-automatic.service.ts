import { Version } from "#/core/domain/version";
import { VersionDecider } from "#/core/services/version-decider.service";
import { ConventionalBumperAdapter } from "#/infrastructure/adapters/conventional-bumper.adapter";

export interface AutomaticVersionOptions {
    currentVersion: string;
    releaseType?: "prerelease" | "release";
    preReleaseId?: string;
}

export class VersionAutomaticService {
    constructor(private readonly bumper: ConventionalBumperAdapter = new ConventionalBumperAdapter()) {}

    async determineNextVersion(options: AutomaticVersionOptions): Promise<Version> {
        const { currentVersion, releaseType = "release", preReleaseId } = options;

        const recommendation = await this.bumper.getBumpRecommendation();

        const decider = new VersionDecider(currentVersion, preReleaseId);
        const next = decider.decide(releaseType, recommendation);

        return new Version(next);
    }
}
