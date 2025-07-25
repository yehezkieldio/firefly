import { Bumper, type BumperRecommendation } from "conventional-recommended-bump";
import { err, ok } from "neverthrow";
import { CommitAnalyzerService } from "#/core/services/commit-analyzer.service";
import type { Commit } from "#/shared/types/commit.type";
import { VersionInferenceError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

interface ConventionalBumperConfig {
    additionalCommitTypes?: {
        major?: string[];
        minor?: string[];
        patch?: string[];
    };
    scopeRules?: Record<string, "major" | "minor" | "patch">;
    customBreakingPatterns?: RegExp[];
}

export class ConventionalBumperAdapter {
    private readonly bumper: Bumper;
    private readonly analyzer: CommitAnalyzerService;
    private readonly basePath: string;
    private readonly config: ConventionalBumperConfig;

    private static readonly HEADER_PATTERN = /^(\w*)(?:\((.*)\))?: (.*)$/;
    private static readonly REVERT_PATTERN = /^Revert "(.+)"\s*\[([a-f0-9]+)\]$/;
    private static readonly BREAKING_HEADER_PATTERN = /^(\w*)(?:\((.*)\))?!: (.*)$/;

    constructor(
        basePath: string = process.cwd(),
        config: ConventionalBumperConfig = {},
        analyzer?: CommitAnalyzerService
    ) {
        this.basePath = basePath;
        this.config = config;
        this.analyzer = analyzer ?? this.createEnhancedAnalyzer();
        this.bumper = new Bumper();
    }

    private createEnhancedAnalyzer(): CommitAnalyzerService {
        const commitConfig = {
            major: ["revert", ...(this.config.additionalCommitTypes?.major ?? [])],
            minor: ["feat", "feature", ...(this.config.additionalCommitTypes?.minor ?? [])],
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
                ...(this.config.additionalCommitTypes?.patch ?? []),
            ],
            scopeRules: {
                deps: "patch" as const,
                security: "patch" as const,
                api: "minor" as const,
                breaking: "major" as const,
                ...this.config.scopeRules,
            },
        };

        return new CommitAnalyzerService(commitConfig);
    }

    private get conventionalBumpOptions() {
        return {
            headerPattern: ConventionalBumperAdapter.HEADER_PATTERN,
            headerCorrespondence: ["type", "scope", "subject"],
            noteKeywords: ["BREAKING CHANGE", "BREAKING-CHANGE"],
            revertPattern: ConventionalBumperAdapter.REVERT_PATTERN,
            revertCorrespondence: ["header", "hash"],
            breakingHeaderPattern: ConventionalBumperAdapter.BREAKING_HEADER_PATTERN,
        };
    }

    async getVersionRecommendation(): Promise<AsyncFireflyResult<BumperRecommendation>> {
        logger.verbose("ConventionalBumperAdapter: Getting version recommendation from commit history...");
        const result = await this.retrieveAndAnalyzeCommits();
        if (result.isErr()) {
            return err(result.error);
        }

        const recommendation = result.value;
        return ok(recommendation);
    }

    private async retrieveAndAnalyzeCommits(): Promise<FireflyResult<BumperRecommendation>> {
        logger.verbose("ConventionalBumperAdapter: Retrieving and analyzing commits...");
        try {
            const recommendation = await this.bumper
                .commits({ path: this.basePath }, this.conventionalBumpOptions)
                .bump((commits: Commit[]) => this.analyzeCommitsWithErrorHandling(commits));

            logger.verbose("ConventionalBumperAdapter: Commits analyzed, validating recommendation...");
            const validationResult = this.validateRecommendation(recommendation);
            if (validationResult.isErr()) {
                return err(validationResult.error);
            }

            logger.verbose("ConventionalBumperAdapter: Recommendation validated successfully.");
            return ok(validationResult.value);
        } catch (error) {
            return err(new VersionInferenceError("Failed to retrieve and analyze commits", error as Error));
        }
    }

    private analyzeCommitsWithErrorHandling(commits: Commit[]): BumperRecommendation {
        logger.verbose("ConventionalBumperAdapter: Analyzing commits for version recommendation...");
        const analysisResult = this.analyzer.analyzeCommits(commits);

        if (analysisResult.isErr()) {
            throw analysisResult.error;
        }

        logger.verbose("ConventionalBumperAdapter: Commits analyzed successfully.");
        return analysisResult.value;
    }

    private validateRecommendation(recommendation: unknown): FireflyResult<BumperRecommendation> {
        logger.verbose("ConventionalBumperAdapter: Validating version recommendation object...");
        if (!this.isValidRecommendation(recommendation)) {
            return err(new VersionInferenceError("Invalid recommendation format"));
        }

        logger.verbose("ConventionalBumperAdapter: Recommendation object is valid.");
        return ok(recommendation as BumperRecommendation);
    }

    private isValidRecommendation(obj: unknown): obj is BumperRecommendation {
        if (typeof obj !== "object" || obj === null) {
            return false;
        }

        const recommendation = obj as Record<string, unknown>;

        return (
            typeof recommendation.level === "number" &&
            recommendation.level >= 0 &&
            recommendation.level <= 2 &&
            typeof recommendation.releaseType === "string" &&
            Array.isArray(recommendation.commits) &&
            typeof recommendation.reason === "string"
        );
    }
}
