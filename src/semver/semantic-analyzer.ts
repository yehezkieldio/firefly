/**
 * Semantic Version Analyzer Module
 *
 * Analyzes commit history to determine the appropriate version bump level
 * based on conventional commits and configurable rules.
 *
 * @module semver/semantic-analyzer
 */

import type { Commit, CommitAnalysis, CommitTypeConfiguration } from "#/semver/commit-types";
import { DEFAULT_COMMIT_TYPE_CONFIG } from "#/semver/commit-types";
import { invalidError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyResult } from "#/utils/result";
import { FireflyErr, FireflyOk } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

/** Version level as semantic versioning ordinal */
export type VersionLevel = 0 | 1 | 2;

/** Human-readable release type names */
export type ReleaseTypeName = "major" | "minor" | "patch";

/**
 * A recommendation for what version bump to apply.
 */
export interface VersionRecommendation {
    /** Numeric level: 0=major, 1=minor, 2=patch */
    readonly level: VersionLevel;
    /** Human-readable release type */
    readonly releaseType: ReleaseTypeName;
    /** The commits that were analyzed */
    readonly commits: readonly Commit[];
    /** Explanation of why this bump was recommended */
    readonly reason: string;
    /** Detailed analysis results */
    readonly analysis: CommitAnalysis;
}

// ============================================================================
// Constants
// ============================================================================

const VERSION_LEVELS = {
    MAJOR: 0,
    MINOR: 1,
    PATCH: 2,
} as const;

const LEVEL_TO_RELEASE_TYPE: Record<VersionLevel, ReleaseTypeName> = {
    0: "major",
    1: "minor",
    2: "patch",
} as const;

const TRANSITION_KEYWORDS = ["general availability", "promote to stable", "move to stable"] as const;

const PATTERN_MATCHERS = {
    /** Matches breaking change syntax: feat(scope)!: message */
    BREAKING_HEADER: /^[a-zA-Z]+(?:\([^)]*\))?!:/,
    /** Matches scope in conventional commit */
    SCOPE_HEADER: /^[a-zA-Z]+\(([^)]+)\)[:!]/,
} as const;

// ============================================================================
// Configuration Merging
// ============================================================================

function mergeConfiguration(partial: Partial<CommitTypeConfiguration>): CommitTypeConfiguration {
    return {
        major: [...DEFAULT_COMMIT_TYPE_CONFIG.major, ...(partial.major ?? [])],
        minor: [...DEFAULT_COMMIT_TYPE_CONFIG.minor, ...(partial.minor ?? [])],
        patch: [...DEFAULT_COMMIT_TYPE_CONFIG.patch, ...(partial.patch ?? [])],
        scopeRules: {
            ...DEFAULT_COMMIT_TYPE_CONFIG.scopeRules,
            ...partial.scopeRules,
        },
    };
}

// ============================================================================
// Commit Analysis Helpers
// ============================================================================

function hasBreakingHeader(commit: Commit): boolean {
    if (!commit.header) return false;
    return PATTERN_MATCHERS.BREAKING_HEADER.test(commit.header);
}

function countBreakingChanges(commit: Commit): number {
    let breakingCount = 0;

    // Count breaking change notes
    breakingCount += commit.notes?.length ?? 0;

    // Check for breaking change header indicator (!)
    if (hasBreakingHeader(commit)) {
        breakingCount += 1;
    }

    return breakingCount;
}

function isFeatureCommit(commit: Commit, config: CommitTypeConfiguration): boolean {
    const type = commit.type?.toLowerCase() ?? "";
    return config.minor.includes(type);
}

function isPatchCommit(commit: Commit, config: CommitTypeConfiguration): boolean {
    const type = commit.type?.toLowerCase() ?? "";
    return config.patch.includes(type);
}

function extractCommitScope(commit: Commit): string | null {
    // First check if scope is directly available
    if (commit.scope) {
        return commit.scope;
    }

    // Extract from header using pattern matching
    if (commit.header) {
        const match = commit.header.match(PATTERN_MATCHERS.SCOPE_HEADER);
        return match?.[1] ?? null;
    }

    return null;
}

function analyzeScopeBreaking(commit: Commit, config: CommitTypeConfiguration): string[] {
    const scope = extractCommitScope(commit);
    if (!scope) return [];

    const scopeRule = config.scopeRules[scope.toLowerCase()];
    if (scopeRule === "major") {
        return [scope];
    }

    return [];
}

function detectPreReleaseTransition(commit: Commit): boolean {
    const message = commit.header?.toLowerCase() ?? "";
    const body = commit.body?.toLowerCase() ?? "";

    return TRANSITION_KEYWORDS.some((keyword) => message.includes(keyword) || body.includes(keyword));
}

// ============================================================================
// Analysis Core
// ============================================================================

function performDetailedAnalysis(commits: readonly Commit[], config: CommitTypeConfiguration): CommitAnalysis {
    logger.verbose("SemanticAnalyzer: Performing detailed commit analysis...");

    const commitsByType: Record<string, Commit[]> = {};

    const initialAnalysis: CommitAnalysis = {
        breakingChanges: 0,
        features: 0,
        patches: 0,
        scopedBreaking: [],
        hasPreReleaseTransition: false,
        commitsByType,
    };

    const analysis = commits.reduce((acc: CommitAnalysis, commit: Commit): CommitAnalysis => {
        const type = commit.type?.toLowerCase() ?? "unknown";

        // Group by type
        const updatedCommitsByType = { ...acc.commitsByType };
        if (!updatedCommitsByType[type]) {
            updatedCommitsByType[type] = [];
        }
        updatedCommitsByType[type] = [...updatedCommitsByType[type], commit];

        return {
            breakingChanges: acc.breakingChanges + countBreakingChanges(commit),
            features: acc.features + (isFeatureCommit(commit, config) ? 1 : 0),
            patches: acc.patches + (isPatchCommit(commit, config) ? 1 : 0),
            scopedBreaking: [...acc.scopedBreaking, ...analyzeScopeBreaking(commit, config)],
            hasPreReleaseTransition: acc.hasPreReleaseTransition || detectPreReleaseTransition(commit),
            commitsByType: updatedCommitsByType,
        };
    }, initialAnalysis);

    logger.verbose(
        `SemanticAnalyzer: Analysis results - Breaking: ${analysis.breakingChanges}, ` +
            `Features: ${analysis.features}, Patches: ${analysis.patches}`
    );

    return analysis;
}

function determineVersionLevel(analysis: CommitAnalysis): VersionLevel {
    logger.verbose("SemanticAnalyzer: Determining version level from analysis...");

    // Breaking changes always result in major version bump
    if (analysis.breakingChanges > 0 || analysis.scopedBreaking.length > 0) {
        logger.verbose("SemanticAnalyzer: Breaking changes detected, recommending MAJOR version bump.");
        return VERSION_LEVELS.MAJOR;
    }

    // Feature commits result in minor version bump
    if (analysis.features > 0) {
        logger.verbose("SemanticAnalyzer: New features detected, recommending MINOR version bump.");
        return VERSION_LEVELS.MINOR;
    }

    // Patch-level commits result in patch version bump
    if (analysis.patches > 0) {
        logger.verbose("SemanticAnalyzer: Patch-level changes detected, recommending PATCH version bump.");
        return VERSION_LEVELS.PATCH;
    }

    // Default to patch for safety when no significant changes are detected
    logger.verbose("SemanticAnalyzer: No significant changes detected, defaulting to PATCH version bump.");
    return VERSION_LEVELS.PATCH;
}

function generateRecommendationReason(analysis: CommitAnalysis): string {
    const reasonParts: string[] = [];

    if (analysis.breakingChanges > 0) {
        const plural = analysis.breakingChanges === 1 ? "change" : "changes";
        reasonParts.push(`${analysis.breakingChanges} breaking ${plural}`);
    }

    if (analysis.scopedBreaking.length > 0) {
        const scopes = analysis.scopedBreaking.join(", ");
        reasonParts.push(`breaking scope(s): ${scopes}`);
    }

    if (analysis.features > 0) {
        const plural = analysis.features === 1 ? "feature" : "features";
        reasonParts.push(`${analysis.features} new ${plural}`);
    }

    if (analysis.patches > 0) {
        const plural = analysis.patches === 1 ? "fix" : "fixes";
        reasonParts.push(`${analysis.patches} ${plural}`);
    }

    if (analysis.hasPreReleaseTransition) {
        reasonParts.push("pre-release transition detected");
    }

    if (reasonParts.length === 0) {
        return "No significant changes detected, defaulting to patch increment";
    }

    return `Analysis found: ${reasonParts.join(", ")}`;
}

function createDefaultPatchRecommendation(commits: readonly Commit[]): VersionRecommendation {
    const emptyAnalysis: CommitAnalysis = {
        breakingChanges: 0,
        features: 0,
        patches: 0,
        scopedBreaking: [],
        hasPreReleaseTransition: false,
        commitsByType: {},
    };

    return {
        level: VERSION_LEVELS.PATCH,
        releaseType: "patch",
        commits: [...commits],
        reason: "No commits provided, defaulting to patch increment for safety",
        analysis: emptyAnalysis,
    };
}

function buildVersionRecommendation(
    level: VersionLevel,
    commits: readonly Commit[],
    analysis: CommitAnalysis
): VersionRecommendation {
    logger.verbose("SemanticAnalyzer: Building version recommendation...");

    return {
        level,
        releaseType: LEVEL_TO_RELEASE_TYPE[level],
        commits: [...commits],
        reason: generateRecommendationReason(analysis),
        analysis,
    };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyzes commits to determine the recommended version bump.
 *
 * @param commits - Array of parsed conventional commits
 * @param config - Optional configuration overrides
 * @returns Version recommendation with analysis details
 *
 * @example
 * ```ts
 * const recommendation = analyzeCommits(commits);
 * if (recommendation.isOk()) {
 *   console.log(`Recommended bump: ${recommendation.value.releaseType}`);
 *   console.log(`Reason: ${recommendation.value.reason}`);
 * }
 * ```
 */
export function analyzeCommits(
    commits: readonly Commit[],
    config: Partial<CommitTypeConfiguration> = {}
): FireflyResult<VersionRecommendation> {
    logger.verbose("SemanticAnalyzer: Starting commit analysis for version recommendation...");
    const startTime = Date.now();

    // Validate input
    if (!Array.isArray(commits)) {
        return FireflyErr(
            invalidError({
                message: "Commits input must be an array",
                source: "semver/semantic-analyzer",
            })
        );
    }

    // Handle empty commits
    if (commits.length === 0) {
        logger.verbose("SemanticAnalyzer: No commits provided, returning patch recommendation.");
        return FireflyOk(createDefaultPatchRecommendation([]));
    }

    const mergedConfig = mergeConfiguration(config);
    const analysis = performDetailedAnalysis(commits, mergedConfig);
    const versionLevel = determineVersionLevel(analysis);
    const recommendation = buildVersionRecommendation(versionLevel, commits, analysis);

    const duration = Date.now() - startTime;
    logger.verbose(
        `SemanticAnalyzer: Analysis completed in ${duration}ms. Recommendation: ${recommendation.releaseType}`
    );

    return FireflyOk(recommendation);
}

/**
 * Creates a default patch recommendation (useful for edge cases).
 */
export function createDefaultRecommendation(): VersionRecommendation {
    return createDefaultPatchRecommendation([]);
}
