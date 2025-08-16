import { err, ok } from "neverthrow";
import type { ReleaseType } from "semver";
import semver from "semver";
import { Version } from "#/core/domain/version";
import { SemverService, type VersionChoicesArgs } from "#/core/services/semver.service";
import { TRANSITION_KEYWORDS } from "#/shared/utils/constants";
import { VersionInferenceError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

interface BumperRecommendation {
    level: number;
    reason: string;
}

interface PreReleaseContext {
    isCurrentPreRelease: boolean;
    preReleaseIdentifier?: string;
    hasStableTransition: boolean;
}

export class VersionDeciderService {
    private readonly bumper: SemverService;

    constructor() {
        this.bumper = new SemverService();
    }

    decideNextVersion(options: VersionChoicesArgs, recommendation?: BumperRecommendation): FireflyResult<string> {
        const preReleaseContext = this.analyzePreReleaseContext(options.currentVersion, recommendation);

        // Handle explicit prerelease request
        if (options.releaseType === "prerelease") {
            return this.handlePreReleaseRequest(options, preReleaseContext);
        }

        // Handle transition from pre-release to stable
        if (preReleaseContext.isCurrentPreRelease && preReleaseContext.hasStableTransition) {
            return this.handlePreReleaseToStableTransition(options, recommendation);
        }

        // Handle recommendation-based versioning
        if (recommendation) {
            return this.createStandardReleaseVersion(options, recommendation, preReleaseContext);
        }

        // Default to standard bump
        return this.bumpVersion(options);
    }

    private analyzePreReleaseContext(currentVersion: string, recommendation?: BumperRecommendation): PreReleaseContext {
        const isCurrentPreRelease = !!semver.prerelease(currentVersion);
        const preReleaseIdentifier = isCurrentPreRelease
            ? (semver.prerelease(currentVersion)?.[0] as string)
            : undefined;

        // Check if recommendation indicates stable transition
        const hasStableTransition = this.detectStableTransition(recommendation);

        return {
            isCurrentPreRelease,
            preReleaseIdentifier,
            hasStableTransition,
        };
    }

    private detectStableTransition(recommendation?: BumperRecommendation): boolean {
        if (!recommendation) return false;

        const reason = recommendation.reason.toLowerCase();
        const transitionKeywords = TRANSITION_KEYWORDS;

        return transitionKeywords.some((keyword) => reason.includes(keyword));
    }

    private handlePreReleaseRequest(options: VersionChoicesArgs, context: PreReleaseContext): FireflyResult<string> {
        // If transitioning from stable to prerelease, need to specify pre-release type
        if (!(context.isCurrentPreRelease || options.preReleaseId)) {
            const modifiedOptions = {
                ...options,
                preReleaseId: options.preReleaseId || "alpha",
                releaseType: "prerelease" as ReleaseType,
            };
            return this.bumpVersion(modifiedOptions);
        }

        return this.bumpVersion({
            ...options,
            releaseType: "prerelease",
        });
    }

    private handlePreReleaseToStableTransition(
        options: VersionChoicesArgs,
        recommendation?: BumperRecommendation,
    ): FireflyResult<string> {
        if (!recommendation) {
            return err(new VersionInferenceError("Cannot transition to stable without recommendation"));
        }

        const currentVersion = Version.create(options.currentVersion);
        if (currentVersion.isErr()) {
            return err(currentVersion.error);
        }

        const baseVersion =
            semver.major(options.currentVersion) +
            "." +
            semver.minor(options.currentVersion) +
            "." +
            semver.patch(options.currentVersion);

        const releaseType = this.mapRecommendationToReleaseType(recommendation.level);
        const stableVersion = semver.inc(baseVersion, releaseType);

        if (!stableVersion) {
            return err(new VersionInferenceError(`Failed to create stable version from ${baseVersion}`));
        }

        return ok(stableVersion);
    }

    private createStandardReleaseVersion(
        options: VersionChoicesArgs,
        recommendation: BumperRecommendation,
        context: PreReleaseContext,
    ): FireflyResult<string> {
        const releaseType = this.mapRecommendationToReleaseType(recommendation.level);

        // If currently in prerelease and no explicit transition, continue prerelease
        if (context.isCurrentPreRelease && !context.hasStableTransition) {
            const preReleaseOptions = {
                ...options,
                releaseType: "prerelease" as ReleaseType,
                preReleaseId: options.preReleaseId || context.preReleaseIdentifier,
            };
            return this.bumpVersion(preReleaseOptions);
        }

        return this.bumpVersion({ ...options, releaseType });
    }

    private mapRecommendationToReleaseType(level: number): ReleaseType {
        const levelMapping: Record<number, ReleaseType> = {
            0: "major",
            1: "minor",
            2: "patch",
        };

        return levelMapping[level] ?? "patch";
    }

    private bumpVersion(options: VersionChoicesArgs): FireflyResult<string> {
        const version = Version.create(options.currentVersion);

        if (version.isErr()) {
            return err(new VersionInferenceError(`Invalid current version: ${options.currentVersion}`, version.error));
        }

        const newVersion = this.bumper.bump({
            currentVersion: version.value,
            releaseType: options.releaseType,
            preReleaseId: options.preReleaseId,
            preReleaseBase: options.preReleaseBase,
        });

        if (newVersion.isErr()) {
            return err(newVersion.error);
        }

        return newVersion.map((v) => v.toString());
    }
}
