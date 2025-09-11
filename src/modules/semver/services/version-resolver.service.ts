import { err, ok } from "neverthrow";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import { type VersionBumpOptions, VersionManagerService } from "#/modules/semver/services/version-manager.service";
import type { Version } from "#/modules/semver/version.domain";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

interface VersionRecommendation {
    readonly level: 0 | 1 | 2;
    readonly releaseType: "major" | "minor" | "patch";
    readonly reason: string;
    readonly analysis: {
        readonly breakingChanges: number;
        readonly features: number;
        readonly patches: number;
        readonly scopedBreaking: string[];
        readonly hasPreReleaseTransition: boolean;
    };
}

export interface VersionDecisionOptions {
    readonly currentVersion: Version;
    readonly releaseType?: ReleaseType;
    readonly prereleaseIdentifier?: string;
    readonly prereleaseBase?: PreReleaseBase;
}

interface PreReleaseContext {
    readonly isCurrentPreRelease: boolean;
    readonly prereleaseIdentifier: string | null;
    readonly hasStableTransition: boolean;
}

export class VersionResolverService {
    private static readonly TRANSITION_KEYWORDS = [
        "stable",
        "release",
        "production",
        "final",
        "ga",
        "general availability",
        "promote to stable",
        "move to stable",
        "release candidate",
        "rc",
    ] as const;

    private static readonly LEVEL_TO_RELEASE_TYPE: Record<0 | 1 | 2, "major" | "minor" | "patch"> = {
        0: "major",
        1: "minor",
        2: "patch",
    } as const;

    static decideNextVersion(
        options: VersionDecisionOptions,
        recommendation?: VersionRecommendation,
    ): FireflyResult<Version> {
        const preReleaseContext = VersionResolverService.analyzePreReleaseContext(
            options.currentVersion,
            recommendation,
        );

        // Handle explicit prerelease request
        if (options.releaseType === "prerelease") {
            return VersionResolverService.handlePreReleaseRequest(options, preReleaseContext);
        }

        // Handle transition from pre-release to stable
        if (preReleaseContext.isCurrentPreRelease && preReleaseContext.hasStableTransition) {
            return VersionResolverService.handlePreReleaseToStableTransition(options, recommendation);
        }

        // Handle recommendation-based versioning
        if (recommendation) {
            return VersionResolverService.createRecommendationBasedVersion(options, recommendation, preReleaseContext);
        }

        // Default to standard bump
        return VersionResolverService.bumpVersion(options);
    }

    private static analyzePreReleaseContext(
        currentVersion: Version,
        recommendation?: VersionRecommendation,
    ): PreReleaseContext {
        const isCurrentPreRelease = currentVersion.isPrerelease;
        const prereleaseIdentifier = currentVersion.prereleaseIdentifier;
        const hasStableTransition = VersionResolverService.detectStableTransition(recommendation);

        return {
            isCurrentPreRelease,
            prereleaseIdentifier,
            hasStableTransition,
        };
    }

    private static detectStableTransition(recommendation?: VersionRecommendation): boolean {
        if (!recommendation) return false;

        const reason = recommendation.reason.toLowerCase();
        return VersionResolverService.TRANSITION_KEYWORDS.some((keyword) => reason.includes(keyword));
    }

    private static handlePreReleaseRequest(
        options: VersionDecisionOptions,
        context: PreReleaseContext,
    ): FireflyResult<Version> {
        const bumpOptions: VersionBumpOptions = {
            currentVersion: options.currentVersion,
            releaseType: "prerelease",
            prereleaseIdentifier: options.prereleaseIdentifier || context.prereleaseIdentifier || "alpha",
            prereleaseBase: options.prereleaseBase,
        };

        return VersionManagerService.bumpVersion(bumpOptions);
    }

    private static handlePreReleaseToStableTransition(
        options: VersionDecisionOptions,
        recommendation?: VersionRecommendation,
    ): FireflyResult<Version> {
        if (!recommendation) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Cannot transition to stable version without recommendation",
                }),
            );
        }

        // Graduate the current prerelease to stable
        const graduateResult = VersionManagerService.bumpVersion({
            currentVersion: options.currentVersion,
            releaseType: "graduate",
        });

        if (graduateResult.isErr()) {
            return err(graduateResult.error);
        }

        const stableVersion = graduateResult.value;

        // If recommendation suggests further bumping after graduation
        if (recommendation.level < 2) {
            const releaseType = VersionResolverService.LEVEL_TO_RELEASE_TYPE[recommendation.level];
            return VersionManagerService.bumpVersion({
                currentVersion: stableVersion,
                releaseType,
            });
        }

        return ok(stableVersion);
    }

    private static createRecommendationBasedVersion(
        options: VersionDecisionOptions,
        recommendation: VersionRecommendation,
        context: PreReleaseContext,
    ): FireflyResult<Version> {
        const releaseType = VersionResolverService.LEVEL_TO_RELEASE_TYPE[recommendation.level];

        // If currently in prerelease and no explicit transition, continue prerelease
        if (context.isCurrentPreRelease && !context.hasStableTransition) {
            const prereleaseOptions: VersionBumpOptions = {
                currentVersion: options.currentVersion,
                releaseType: "prerelease",
                prereleaseIdentifier: options.prereleaseIdentifier || context.prereleaseIdentifier || "alpha",
                prereleaseBase: options.prereleaseBase,
            };
            return VersionManagerService.bumpVersion(prereleaseOptions);
        }

        // Standard release based on recommendation
        return VersionResolverService.bumpVersion({
            ...options,
            releaseType,
        });
    }

    private static bumpVersion(options: VersionDecisionOptions): FireflyResult<Version> {
        if (!options.releaseType) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Release type is required for version bump",
                }),
            );
        }

        const bumpOptions: VersionBumpOptions = {
            currentVersion: options.currentVersion,
            releaseType: options.releaseType,
            prereleaseIdentifier: options.prereleaseIdentifier,
            prereleaseBase: options.prereleaseBase,
        };

        return VersionManagerService.bumpVersion(bumpOptions);
    }
}
