import { err, ok } from "neverthrow";
import { GitProvider } from "#/modules/git/git.provider";
import { CommitHistoryService } from "#/modules/git/services/commit-history.service";
import { SemanticVersionAnalyzer } from "#/modules/semver/services/semantic-version-analyzer.service";
import { logger } from "#/shared/logger";
import type { Commit } from "#/shared/types/commit.types";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

interface VersionRecommendation {
    readonly level: 0 | 1 | 2;
    readonly releaseType: "major" | "minor" | "patch";
    readonly commits: readonly Commit[];
    readonly reason: string;
    readonly analysis: {
        readonly breakingChanges: number;
        readonly features: number;
        readonly patches: number;
        readonly scopedBreaking: string[];
        readonly hasPreReleaseTransition: boolean;
        readonly commitsByType: Record<string, Commit[]>;
    };
}

interface SemanticVersionServiceConfiguration {
    readonly additionalCommitTypes?: {
        readonly major?: readonly string[];
        readonly minor?: readonly string[];
        readonly patch?: readonly string[];
    };
    readonly scopeRules?: Readonly<Record<string, "major" | "minor" | "patch">>;
    readonly includeAllCommitsWhenNoTags?: boolean;
}

export class SemanticVersionService {
    private readonly gitProvider: GitProvider;
    private readonly commitHistoryService: CommitHistoryService;
    private readonly versionAnalyzer: SemanticVersionAnalyzer;
    private readonly configuration: SemanticVersionServiceConfiguration;

    constructor(gitProvider?: GitProvider, configuration: SemanticVersionServiceConfiguration = {}) {
        this.gitProvider = gitProvider ?? new GitProvider();
        this.commitHistoryService = new CommitHistoryService(this.gitProvider);
        this.versionAnalyzer = new SemanticVersionAnalyzer({
            major: configuration.additionalCommitTypes?.major,
            minor: configuration.additionalCommitTypes?.minor,
            patch: configuration.additionalCommitTypes?.patch,
            scopeRules: configuration.scopeRules,
        });
        this.configuration = {
            includeAllCommitsWhenNoTags: false,
            ...configuration,
        };
    }

    async recommendVersion(): Promise<FireflyResult<VersionRecommendation>> {
        logger.verbose("SemanticVersionService: Starting version recommendation process...");
        const startTime = Date.now();

        const commitsResult = await this.getRelevantCommits();
        if (commitsResult.isErr()) {
            return err(commitsResult.error);
        }

        const commits = commitsResult.value;
        logger.verbose(`SemanticVersionService: Analyzing ${commits.length} commits for version recommendation`);

        if (commits.length === 0) {
            logger.verbose("SemanticVersionService: No commits found, returning default patch recommendation");
            return ok(this.createDefaultRecommendation());
        }

        const analysisResult = this.versionAnalyzer.analyzeCommits(commits);
        if (analysisResult.isErr()) {
            return err(analysisResult.error);
        }

        const recommendation = analysisResult.value;
        const duration = Date.now() - startTime;

        logger.verbose(
            `SemanticVersionService: Version recommendation completed in ${duration}ms. ` +
                `Recommendation: ${recommendation.releaseType} (level ${recommendation.level})`,
        );

        return ok(recommendation);
    }

    async getCommitsSinceLastTag(): Promise<FireflyAsyncResult<Commit[]>> {
        logger.verbose("SemanticVersionService: Retrieving commits since last tag...");
        return this.commitHistoryService.getCommitsSinceLastTag();
    }

    async getAllCommits(): Promise<FireflyAsyncResult<Commit[]>> {
        logger.verbose("SemanticVersionService: Retrieving all commits...");
        return this.commitHistoryService.getAllCommits();
    }

    async getLastTag(): Promise<FireflyAsyncResult<string | null>> {
        logger.verbose("SemanticVersionService: Getting last git tag...");
        return this.gitProvider.history.lastTagOrNull();
    }

    async hasAnyTags(): Promise<FireflyAsyncResult<boolean>> {
        logger.verbose("SemanticVersionService: Checking if repository has any tags...");

        const lastTagResult = await this.getLastTag();
        if (lastTagResult.isErr()) {
            return err(lastTagResult.error);
        }

        return ok(lastTagResult.value !== null);
    }

    analyzeCommitsOnly(commits: readonly Commit[]): FireflyResult<VersionRecommendation> {
        logger.verbose(
            `SemanticVersionService: Analyzing provided ${commits.length} commits without fetching from git`,
        );
        return this.versionAnalyzer.analyzeCommits(commits);
    }

    private async getRelevantCommits(): Promise<FireflyAsyncResult<Commit[]>> {
        const hasTagsResult = await this.hasAnyTags();
        if (hasTagsResult.isErr()) {
            return err(hasTagsResult.error);
        }

        const hasTags = hasTagsResult.value;

        if (!hasTags) {
            logger.verbose("SemanticVersionService: No tags found in repository");

            if (this.configuration.includeAllCommitsWhenNoTags) {
                logger.verbose("SemanticVersionService: Configuration set to include all commits when no tags exist");
                return this.commitHistoryService.getAllCommits();
            }

            logger.verbose("SemanticVersionService: Configuration set to return empty commits when no tags exist");
            return ok([]);
        }

        logger.verbose("SemanticVersionService: Tags found, retrieving commits since last tag");
        return this.commitHistoryService.getCommitsSinceLastTag();
    }

    private createDefaultRecommendation(): VersionRecommendation {
        return {
            level: 2, // PATCH
            releaseType: "patch",
            commits: [],
            reason: "No commits available for analysis, defaulting to patch increment",
            analysis: {
                breakingChanges: 0,
                features: 0,
                patches: 0,
                scopedBreaking: [],
                hasPreReleaseTransition: false,
                commitsByType: {},
            },
        };
    }
}
