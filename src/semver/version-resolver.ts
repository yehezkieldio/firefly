/**
 * Version Resolver Module
 *
 * Resolves the next version based on analysis recommendations, current version state,
 * and release configuration. Handles pre-release transitions, graduation to stable,
 * and standard version bumps.
 *
 * @module semver/version-resolver
 */

import type { PreReleaseBase, ReleaseType } from "#/commands/release/config";
import type { VersionRecommendation } from "#/semver/semantic-analyzer";
import type { Version } from "#/semver/version";
import { VersionManager } from "#/semver/version-manager";
import { invalidError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyResult } from "#/utils/result";
import { FireflyErr, FireflyOk } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for determining the next version.
 */
export interface VersionDecisionOptions {
    /** Current version to bump from */
    readonly currentVersion: Version;
    /** Optional explicit release type */
    readonly releaseType?: ReleaseType;
    /** Pre-release identifier (e.g., "alpha", "beta") */
    readonly prereleaseIdentifier?: string;
    /** Base number for pre-release versions */
    readonly prereleaseBase?: PreReleaseBase;
}

interface PreReleaseContext {
    readonly isCurrentPreRelease: boolean;
    readonly prereleaseIdentifier: string | null;
    readonly hasStableTransition: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TRANSITION_KEYWORDS = [
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

const LEVEL_TO_RELEASE_TYPE: Record<0 | 1 | 2, "major" | "minor" | "patch"> = {
    0: "major",
    1: "minor",
    2: "patch",
} as const;

// ============================================================================
// Context Analysis
// ============================================================================

function analyzePreReleaseContext(currentVersion: Version, recommendation?: VersionRecommendation): PreReleaseContext {
    const isCurrentPreRelease = currentVersion.isPrerelease;
    const prereleaseIdentifier = currentVersion.prereleaseIdentifier;
    const hasStableTransition = detectStableTransition(recommendation);

    return {
        isCurrentPreRelease,
        prereleaseIdentifier,
        hasStableTransition,
    };
}

function detectStableTransition(recommendation?: VersionRecommendation): boolean {
    if (!recommendation) return false;

    const reason = recommendation.reason.toLowerCase();
    return TRANSITION_KEYWORDS.some((keyword) => reason.includes(keyword));
}

// ============================================================================
// Version Bump Handlers
// ============================================================================

function handlePreReleaseRequest(options: VersionDecisionOptions, context: PreReleaseContext): FireflyResult<Version> {
    logger.verbose("VersionResolver: Bumping to prerelease version...");

    return VersionManager.bumpVersion({
        currentVersion: options.currentVersion,
        releaseType: "prerelease",
        prereleaseIdentifier: options.prereleaseIdentifier ?? context.prereleaseIdentifier ?? "alpha",
        prereleaseBase: options.prereleaseBase,
    });
}

function handlePreReleaseToStableTransition(
    options: VersionDecisionOptions,
    recommendation?: VersionRecommendation
): FireflyResult<Version> {
    if (!recommendation) {
        return FireflyErr(
            invalidError({
                message: "Cannot transition to stable version without recommendation",
                source: "semver/version-resolver",
            })
        );
    }

    // Graduate the current prerelease to stable
    const graduateResult = VersionManager.bumpVersion({
        currentVersion: options.currentVersion,
        releaseType: "graduate",
    });

    if (graduateResult.isErr()) {
        return FireflyErr(graduateResult.error);
    }

    const stableVersion = graduateResult.value;

    // If recommendation suggests further bumping after graduation
    if (recommendation.level < 2) {
        logger.verbose("VersionResolver: Further bumping after graduation...");
        const releaseType = LEVEL_TO_RELEASE_TYPE[recommendation.level];
        return VersionManager.bumpVersion({
            currentVersion: stableVersion,
            releaseType,
        });
    }

    logger.verbose("VersionResolver: Graduated to stable version:", stableVersion.raw);
    return FireflyOk(stableVersion);
}

function createRecommendationBasedVersion(
    options: VersionDecisionOptions,
    recommendation: VersionRecommendation,
    context: PreReleaseContext
): FireflyResult<Version> {
    const releaseType = LEVEL_TO_RELEASE_TYPE[recommendation.level];

    // If currently in prerelease and no explicit transition, continue prerelease
    if (context.isCurrentPreRelease && !context.hasStableTransition) {
        logger.verbose("VersionResolver: Continuing prerelease versioning...");
        return VersionManager.bumpVersion({
            currentVersion: options.currentVersion,
            releaseType: "prerelease",
            prereleaseIdentifier: options.prereleaseIdentifier ?? context.prereleaseIdentifier ?? "alpha",
            prereleaseBase: options.prereleaseBase,
        });
    }

    // Standard release based on recommendation
    logger.verbose("VersionResolver: Bumping version based on recommendation...");
    return bumpStandardVersion({ ...options, releaseType });
}

function bumpStandardVersion(options: VersionDecisionOptions & { releaseType: ReleaseType }): FireflyResult<Version> {
    return VersionManager.bumpVersion({
        currentVersion: options.currentVersion,
        releaseType: options.releaseType,
        prereleaseIdentifier: options.prereleaseIdentifier,
        prereleaseBase: options.prereleaseBase,
    });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Decides the next version based on options and optional recommendation.
 *
 * The resolution follows this priority:
 * 1. Explicit prerelease request → bump prerelease
 * 2. Current is prerelease + stable transition detected → graduate and optionally bump
 * 3. Recommendation available → use recommended bump level
 * 4. Explicit release type → use that
 * 5. Error if no resolution possible
 *
 * @param options - Version decision options including current version
 * @param recommendation - Optional version recommendation from commit analysis
 * @returns The resolved next version
 *
 * @example
 * ```ts
 * const nextVersion = resolveNextVersion(
 *   { currentVersion, releaseType: "minor" },
 *   recommendation
 * );
 * if (nextVersion.isOk()) {
 *   console.log(`Next version: ${nextVersion.value.raw}`);
 * }
 * ```
 */
export function resolveNextVersion(
    options: VersionDecisionOptions,
    recommendation?: VersionRecommendation
): FireflyResult<Version> {
    logger.verbose("VersionResolver: Deciding next version...");

    const preReleaseContext = analyzePreReleaseContext(options.currentVersion, recommendation);

    // Handle explicit prerelease request
    if (options.releaseType === "prerelease") {
        logger.verbose("VersionResolver: Handling prerelease request...");
        return handlePreReleaseRequest(options, preReleaseContext);
    }

    // Handle transition from pre-release to stable
    if (preReleaseContext.isCurrentPreRelease && preReleaseContext.hasStableTransition) {
        logger.verbose("VersionResolver: Handling pre-release to stable transition...");
        return handlePreReleaseToStableTransition(options, recommendation);
    }

    // Handle recommendation-based versioning
    if (recommendation) {
        logger.verbose("VersionResolver: Handling recommendation-based versioning...");
        return createRecommendationBasedVersion(options, recommendation, preReleaseContext);
    }

    // Handle explicit release type without recommendation
    if (options.releaseType) {
        logger.verbose("VersionResolver: Handling explicit release type...");
        return bumpStandardVersion({
            ...options,
            releaseType: options.releaseType,
        });
    }

    // No resolution possible
    return FireflyErr(
        invalidError({
            message: "Cannot determine next version: no release type or recommendation provided",
            source: "semver/version-resolver",
        })
    );
}
