import type { ReleaseType } from "semver";
import type { Version } from "#/core/domain/version";
import { bumpVersion } from "#/core/services/semver.service";

export interface VersionDecisionContext {
    readonly current: Version;
    readonly recommendation: BumpRecommendation;
    readonly preReleaseId?: string;
    readonly preReleaseBase?: string;
    readonly explicitReleaseType?: ReleaseType;
}

export interface BumpRecommendation {
    readonly level: 0 | 1 | 2;
    readonly reason: string;
}

/**
 * Decides the next version based on conventional recommendations or explicit user intent.
 */
export class VersionDecisionService {
    decideNextVersion(context: VersionDecisionContext): Version {
        const { current, recommendation, preReleaseId, preReleaseBase, explicitReleaseType } = context;

        const increment = this._determineIncrement(recommendation, explicitReleaseType);

        return bumpVersion({
            current,
            increment,
            preReleaseId,
            preReleaseBase,
        });
    }

    private _determineIncrement(
        recommendation: BumpRecommendation,
        explicitReleaseType?: ReleaseType
    ): ReleaseType {
        if (explicitReleaseType === "prerelease") return "prerelease";
        if (explicitReleaseType) return explicitReleaseType;

        return recommendation.level === 0 ? "major" : recommendation.level === 1 ? "minor" : "patch";
    }
}
