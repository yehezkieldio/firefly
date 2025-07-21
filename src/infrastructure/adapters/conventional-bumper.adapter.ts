import { Bumper, type BumperRecommendation } from "conventional-recommended-bump";
import { ResultAsync } from "neverthrow";
import type { Commit } from "#/core/domain/commit";
import { CommitAnalyzerService } from "#/core/services/commit-analyzer.service";
import { CONVENTIONAL_BUMP_OPTIONS } from "#/shared/constants/conventional-bump-options";
import { FireflyError } from "#/shared/utils/error";

export class ConventionalBumperAdapter {
    private readonly bumper: Bumper;
    private readonly analyzer: CommitAnalyzerService;
    private readonly basePath: string;

    constructor(basePath: string = process.cwd(), analyzer: CommitAnalyzerService = new CommitAnalyzerService()) {
        this.basePath = basePath;
        this.analyzer = analyzer;
        this.bumper = new Bumper();
    }

    getVersionRecommendation(): ResultAsync<BumperRecommendation, FireflyError> {
        return ResultAsync.fromPromise(
            this.retrieveAndAnalyzeCommits(),
            (error) =>
                new FireflyError(
                    `Failed to get version recommendation: ${error instanceof Error ? error.message : error}`,
                    "VERSION_RECOMMENDATION_ERROR"
                )
        );
    }

    private async retrieveAndAnalyzeCommits(): Promise<BumperRecommendation> {
        try {
            const recommendation = await this.bumper
                .commits({ path: this.basePath }, CONVENTIONAL_BUMP_OPTIONS)
                .bump((commits: Commit[]) => this.analyzeCommitsWithErrorHandling(commits));

            return this.validateRecommendation(recommendation);
        } catch (error) {
            throw new FireflyError(
                `Commit retrieval failed: ${error instanceof Error ? error.message : error}`,
                "COMMIT_RETRIEVAL_ERROR"
            );
        }
    }

    private analyzeCommitsWithErrorHandling(commits: Commit[]): BumperRecommendation {
        const analysisResult = this.analyzer.analyzeCommits(commits);

        if (analysisResult.isErr()) {
            throw analysisResult.error;
        }

        return analysisResult.value;
    }

    private validateRecommendation(recommendation: unknown): BumperRecommendation {
        if (!this.isValidRecommendation(recommendation)) {
            throw new FireflyError(
                "Invalid recommendation structure received from conventional bump analysis",
                "INVALID_RECOMMENDATION_STRUCTURE"
            );
        }

        return recommendation as BumperRecommendation;
    }

    private isValidRecommendation(obj: unknown): obj is BumperRecommendation {
        if (typeof obj !== "object" || obj === null) {
            return false;
        }

        const recommendation = obj as Record<string, unknown>;

        return (
            typeof recommendation.level === "number" &&
            typeof recommendation.releaseType === "string" &&
            Array.isArray(recommendation.commits) &&
            typeof recommendation.reason === "string"
        );
    }
}
