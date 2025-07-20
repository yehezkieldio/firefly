import type { BumperRecommendation } from "conventional-recommended-bump";
import { err, ok, type Result } from "neverthrow";
import type { Commit } from "#/core/domain/commit";
import { FireflyError } from "#/shared/utils/error";

interface CommitAnalysis {
    readonly breakingChanges: number;
    readonly features: number;
}

export class CommitAnalyzerService {
    private static readonly VERSION_LEVELS = {
        MAJOR: 0,
        MINOR: 1,
        PATCH: 2,
    } as const;

    private static readonly RELEASE_TYPES = {
        [CommitAnalyzerService.VERSION_LEVELS.MAJOR]: "major",
        [CommitAnalyzerService.VERSION_LEVELS.MINOR]: "minor",
        [CommitAnalyzerService.VERSION_LEVELS.PATCH]: "patch",
    } as const;

    analyzeCommits(commits: readonly Commit[]): Result<BumperRecommendation, FireflyError> {
        try {
            if (!commits?.length) {
                return ok(this.createPatchRecommendation([]));
            }

            const analysis = this.performCommitAnalysis(commits);
            const level = this.determineVersionLevel(analysis);
            const recommendation = this.buildRecommendation(level, commits, analysis);

            return ok(recommendation);
        } catch (error) {
            return err(
                new FireflyError(
                    `Failed to analyze commits: ${error instanceof Error ? error.message : error}`,
                    "COMMIT_ANALYSIS_ERROR"
                )
            );
        }
    }

    private performCommitAnalysis(commits: readonly Commit[]): CommitAnalysis {
        return commits.reduce(
            (analysis: CommitAnalysis, commit: Commit): CommitAnalysis => ({
                breakingChanges: analysis.breakingChanges + this.countBreakingChanges(commit),
                features: analysis.features + this.countFeatures(commit),
            }),
            { breakingChanges: 0, features: 0 }
        );
    }

    private countBreakingChanges(commit: Commit): number {
        return commit.notes?.length ?? 0;
    }

    private countFeatures(commit: Commit): number {
        return commit.type === "feat" ? 1 : 0;
    }

    private determineVersionLevel(analysis: CommitAnalysis): 0 | 1 | 2 {
        if (analysis.breakingChanges > 0) {
            return CommitAnalyzerService.VERSION_LEVELS.MAJOR;
        }

        if (analysis.features > 0) {
            return CommitAnalyzerService.VERSION_LEVELS.MINOR;
        }

        return CommitAnalyzerService.VERSION_LEVELS.PATCH;
    }

    private buildRecommendation(
        level: 0 | 1 | 2,
        commits: readonly Commit[],
        analysis: CommitAnalysis
    ): BumperRecommendation {
        return {
            level,
            releaseType: CommitAnalyzerService.RELEASE_TYPES[level],
            commits: [...commits],
            reason: this.generateAnalysisReason(analysis),
        };
    }

    private createPatchRecommendation(commits: readonly Commit[]): BumperRecommendation {
        return {
            level: CommitAnalyzerService.VERSION_LEVELS.PATCH,
            releaseType: "patch",
            commits: [...commits],
            reason: "No significant changes detected, defaulting to patch increment",
        };
    }

    private generateAnalysisReason(analysis: CommitAnalysis): string {
        const { breakingChanges, features } = analysis;
        const verb = breakingChanges === 1 ? "is" : "are";
        const breakingText = this.formatBreakingChangesText(breakingChanges);
        const featuresText = this.formatFeaturesText(features);

        return `There ${verb} ${breakingText} and ${featuresText}`;
    }

    private formatBreakingChangesText(count: number): string {
        const plural = count === 1 ? "" : "S";
        return `${count} BREAKING CHANGE${plural}`;
    }

    private formatFeaturesText(count: number): string {
        const plural = count === 1 ? "" : "s";
        return `${count} feature${plural}`;
    }
}
