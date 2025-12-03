import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { CommitTypeConfiguration } from "#/domain/commits/commit-types";
import type { VersionRecommendation } from "#/services/contracts/version-strategy.interface";

/**
 * Options for commit analysis operations.
 */
export interface CommitAnalysisOptions {
    /**
     * Optional configuration overrides for commit type mapping
     */
    readonly config?: Partial<CommitTypeConfiguration>;
}

/**
 * Service for commit history analysis and version recommendations.
 */
export interface ICommitAnalysisService {
    /**
     * Analyzes commits since the last tag and returns a version recommendation.
     *
     * @param options - Analysis options including commit type configuration
     * @returns Version recommendation with analysis details
     */
    analyzeForVersion(options?: CommitAnalysisOptions): FireflyAsyncResult<VersionRecommendation>;

    /**
     * Creates a default patch recommendation.
     * Useful for edge cases when no commits are found or analysis fails.
     *
     * @returns Default patch-level recommendation
     */
    createDefaultRecommendation(): VersionRecommendation;
}
