import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { CommitAnalysis } from "#/domain/commits/commit-types";
import type { PreReleaseBase, ReleaseType } from "#/domain/semver/semver.definitions";
import type { Version } from "#/domain/semver/version";

// Version level as semantic versioning ordinal
export type VersionLevel = 0 | 1 | 2;

// Human-readable release type names
export type ReleaseTypeName = "major" | "minor" | "patch";

/**
 * A recommendation for what version bump to apply.
 */
export interface VersionRecommendation {
    /**
     * Numeric level: 0=major, 1=minor, 2=patch
     */
    readonly level: VersionLevel;

    /**
     * Human-readable release type
     */
    readonly releaseType: ReleaseTypeName;

    /**
     * Explanation of why this bump was recommended
     */
    readonly reason: string;

    /**
     * Detailed analysis results
     */
    readonly analysis: CommitAnalysis;
}

/**
 * Represents a selectable version choice for prompts.
 */
export interface VersionChoice {
    /**
     * Display label (e.g., "minor (1.1.0)")
     */
    readonly label: string;

    /**
     * The version string value
     */
    readonly value: string;

    /**
     * Optional hint describing the release type
     */
    readonly hint?: string;
}

/**
 * Options for resolving the next version.
 */
export interface ResolveVersionOptions {
    /**
     * Current version to bump from
     */
    readonly currentVersion: Version;

    /**
     * Optional explicit release type
     */
    readonly releaseType?: ReleaseType;

    /**
     * Pre-release identifier (e.g., "alpha", "beta")
     */
    readonly preReleaseID?: string;

    /**
     * Base number for pre-release versions
     */
    readonly preReleaseBase?: PreReleaseBase;
}

/**
 * Options for generating version choices.
 */
export interface GenerateChoicesOptions {
    /**
     * Current version to generate choices from
     */
    readonly currentVersion: Version;

    /**
     * Optional filter to specific release type
     */
    readonly releaseType?: ReleaseType;

    /**
     * Pre-release identifier for pre-release choices
     */
    readonly preReleaseID?: string;

    /**
     * Base number for pre-release versions
     */
    readonly preReleaseBase?: PreReleaseBase;
}

/**
 * Service for version strategy decisions and choice generation.
 */
export interface IVersionStrategyService {
    /**
     * Resolves the next version based on options and optional recommendation.
     *
     * Handles:
     * - Explicit release type requests
     * - Recommendation-based versioning
     * - Pre-release to stable transitions
     * - Pre-release continuations
     *
     * @param options - Version resolution options
     * @param recommendation - Optional analysis recommendation
     * @returns The resolved next version
     */
    resolveVersion(options: ResolveVersionOptions, recommendation?: VersionRecommendation): FireflyAsyncResult<Version>;

    /**
     * Generates version choices for interactive prompts.
     *
     * Automatically determines which version types are available based on
     * the current version state (e.g., pre-release vs stable).
     *
     * @param options - Choice generation options
     * @returns Array of version choices for selection
     */
    generateChoices(options: GenerateChoicesOptions): FireflyAsyncResult<VersionChoice[]>;
}
