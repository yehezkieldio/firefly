import { err, ok } from "neverthrow";
import type { GitProviderPort } from "#/core/ports/git-provider.port";
import { CommitAnalyzerService } from "#/core/services/commit-analyzer.service";
import { CommitRetrieverService } from "#/infrastructure/services/commit-retriever.service";
import type { Commit } from "#/shared/types/commit.type";
import { VersionInferenceError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult } from "#/shared/utils/result.util";

interface VersionRecommendation {
    readonly level: 0 | 1 | 2;
    readonly releaseType: "major" | "minor" | "patch";
    readonly commits: readonly Commit[];
    readonly reason: string;
}

interface SemanticVersionServiceConfig {
    additionalCommitTypes?: {
        major?: string[];
        minor?: string[];
        patch?: string[];
    };
    scopeRules?: Record<string, "major" | "minor" | "patch">;
}

export class SemanticVersionService {
    private readonly commitRetriever: CommitRetrieverService;
    private readonly analyzer: CommitAnalyzerService;

    constructor(
        private readonly gitProvider: GitProviderPort,
        config: SemanticVersionServiceConfig = {}
    ) {
        this.commitRetriever = new CommitRetrieverService(gitProvider);
        this.analyzer = this.createEnhancedAnalyzer(config);
    }

    private createEnhancedAnalyzer(config: SemanticVersionServiceConfig): CommitAnalyzerService {
        const commitConfig = {
            major: ["revert", ...(config.additionalCommitTypes?.major ?? [])],
            minor: ["feat", "feature", ...(config.additionalCommitTypes?.minor ?? [])],
            patch: [
                "fix",
                "perf",
                "refactor",
                "style",
                "test",
                "build",
                "ci",
                "chore",
                "docs",
                "security",
                ...(config.additionalCommitTypes?.patch ?? []),
            ],
            scopeRules: {
                deps: "patch" as const,
                security: "patch" as const,
                api: "minor" as const,
                breaking: "major" as const,
                ...config.scopeRules,
            },
        };

        return new CommitAnalyzerService(commitConfig);
    }

    async getVersionRecommendation(): Promise<AsyncFireflyResult<VersionRecommendation>> {
        logger.verbose("SemanticVersionService: Getting version recommendation from commits since last tag...");

        try {
            // Get commits since last tag
            const commitsResult = await this.commitRetriever.getCommitsSinceLastTag();
            if (commitsResult.isErr()) {
                return err(commitsResult.error);
            }

            const commits = commitsResult.value;
            logger.verbose(`SemanticVersionService: Retrieved ${commits.length} commits since last tag`);

            // Analyze commits to determine version bump
            const analysisResult = this.analyzer.analyzeCommits(commits);
            if (analysisResult.isErr()) {
                return err(analysisResult.error);
            }

            const recommendation = analysisResult.value;
            logger.verbose(`SemanticVersionService: Analysis complete. Recommendation: ${recommendation.releaseType}`);

            return ok(recommendation);
        } catch (error) {
            return err(new VersionInferenceError("Failed to get version recommendation", error as Error));
        }
    }

    async getCommitsSinceLastTag(): Promise<AsyncFireflyResult<Commit[]>> {
        logger.verbose("SemanticVersionService: Retrieving commits since last tag...");
        return this.commitRetriever.getCommitsSinceLastTag();
    }

    async getLastTag(): Promise<AsyncFireflyResult<string | null>> {
        logger.verbose("SemanticVersionService: Getting last tag...");
        return this.gitProvider.getLastTag();
    }
}
