import type { BumperRecommendation } from "conventional-recommended-bump";
import { err, ok } from "neverthrow";
import type { Commit } from "#/shared/types/commit.type";
import { TRANSITION_KEYWORDS } from "#/shared/utils/constants";
import { VersionInferenceError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

interface CommitAnalysis {
    readonly breakingChanges: number;
    readonly features: number;
    readonly patches: number;
    readonly scopedBreaking: string[];
    readonly hasPreReleaseTransition: boolean;
}

interface CommitTypeConfig {
    readonly major: readonly string[];
    readonly minor: readonly string[];
    readonly patch: readonly string[];
    readonly scopeRules: Record<string, "major" | "minor" | "patch">;
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

    private static readonly DEFAULT_COMMIT_CONFIG: CommitTypeConfig = {
        major: ["revert"],
        minor: ["feat", "feature"],
        patch: ["fix", "perf", "refactor", "style", "test", "build", "ci", "chore", "docs"],
        scopeRules: {
            deps: "patch",
            security: "patch",
            api: "minor",
            breaking: "major",
        },
    };

    private static readonly BREAKING_HEADER_REGEX = /^[a-zA-Z]+(?:\([^)]*\))?!:/;
    private static readonly SCOPE_HEADER_REGEX = /^[a-zA-Z]+\(([^)]+)\)[:!]/;

    constructor(private readonly commitConfig: CommitTypeConfig = CommitAnalyzerService.DEFAULT_COMMIT_CONFIG) {}

    analyzeCommits(commits: readonly Commit[]): FireflyResult<BumperRecommendation> {
        logger.verbose("CommitAnalyzerService: Analyzing commits for version recommendation...");
        const start = Date.now();
        if (!commits?.length) {
            logger.verbose("CommitAnalyzerService: No commits provided, defaulting to patch recommendation.");
            return ok(this.createPatchRecommendation([]));
        }

        if (!Array.isArray(commits)) {
            return err(new VersionInferenceError("Commits input is not an array"));
        }

        logger.verbose(`CommitAnalyzerService: Performing commit analysis on ${commits.length} commit(s)...`);
        const analysis = this.performCommitAnalysis(commits);
        logger.verbose(`CommitAnalyzerService: Commit analysis result: ${JSON.stringify(analysis)}`);
        const level = this.determineVersionLevel(analysis);
        logger.verbose(`CommitAnalyzerService: Determined version level: ${level}`);
        const recommendation = this.buildRecommendation(level, commits, analysis);
        const duration = Date.now() - start;
        logger.verbose(`CommitAnalyzerService: Took ${duration}ms to analyze and build recommendation.`);

        return ok(recommendation);
    }

    private performCommitAnalysis(commits: readonly Commit[]): CommitAnalysis {
        logger.verbose("CommitAnalyzerService: Reducing commits to perform analysis...");
        const result = commits.reduce(
            (analysis: CommitAnalysis, commit: Commit): CommitAnalysis => {
                const breakingChanges = this.countBreakingChanges(commit);
                const isFeature = this.isFeatureCommit(commit);
                const isPatch = this.isPatchCommit(commit);
                const scopedBreaking = this.analyzeScopeBreaking(commit);
                const hasPreReleaseTransition = this.detectPreReleaseTransition(commit);

                return {
                    breakingChanges: analysis.breakingChanges + breakingChanges,
                    features: analysis.features + (isFeature ? 1 : 0),
                    patches: analysis.patches + (isPatch ? 1 : 0),
                    scopedBreaking: [...analysis.scopedBreaking, ...scopedBreaking],
                    hasPreReleaseTransition: analysis.hasPreReleaseTransition || hasPreReleaseTransition,
                };
            },
            {
                breakingChanges: 0,
                features: 0,
                patches: 0,
                scopedBreaking: [],
                hasPreReleaseTransition: false,
            }
        );
        logger.verbose(`CommitAnalyzerService: Commit analysis reduction complete: ${JSON.stringify(result)}`);
        return result;
    }

    private countBreakingChanges(commit: Commit): number {
        let breakingCount = 0;

        breakingCount += commit.notes?.length ?? 0;

        if (this.hasBreakingHeader(commit)) {
            breakingCount += 1;
        }

        return breakingCount;
    }

    private hasBreakingHeader(commit: Commit): boolean {
        if (!commit.header) return false;
        return CommitAnalyzerService.BREAKING_HEADER_REGEX.test(commit.header);
    }

    private isFeatureCommit(commit: Commit): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return this.commitConfig.minor.includes(type);
    }

    private isPatchCommit(commit: Commit): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return this.commitConfig.patch.includes(type);
    }

    private analyzeScopeBreaking(commit: Commit): string[] {
        const scope = this.extractScope(commit);
        if (!scope) return [];

        const scopeRule = this.commitConfig.scopeRules[scope.toLowerCase()];
        if (scopeRule === "major") {
            return [scope];
        }

        return [];
    }

    private extractScope(commit: Commit): string | null {
        if (commit.scope) {
            return commit.scope;
        }

        if (commit.header) {
            const match = commit.header.match(CommitAnalyzerService.SCOPE_HEADER_REGEX);
            return match?.[1] ?? null;
        }

        return null;
    }

    private detectPreReleaseTransition(commit: Commit): boolean {
        const message = commit.header?.toLowerCase() ?? "";
        const body = commit.body?.toLowerCase() ?? "";

        const transitionKeywords = TRANSITION_KEYWORDS;

        return transitionKeywords.some((keyword) => message.includes(keyword) || body.includes(keyword));
    }

    private determineVersionLevel(analysis: CommitAnalysis): 0 | 1 | 2 {
        logger.verbose("CommitAnalyzerService: Determining version level from analysis...");
        // Breaking changes always result in major version
        if (analysis.breakingChanges > 0 || analysis.scopedBreaking.length > 0) {
            logger.verbose("CommitAnalyzerService: Breaking changes or scoped breaking found, returning MAJOR.");
            return CommitAnalyzerService.VERSION_LEVELS.MAJOR;
        }

        // Feature commits result in minor version
        if (analysis.features > 0) {
            logger.verbose("CommitAnalyzerService: Features found, returning MINOR.");
            return CommitAnalyzerService.VERSION_LEVELS.MINOR;
        }

        // Any patch-level commits result in patch version
        if (analysis.patches > 0) {
            logger.verbose("CommitAnalyzerService: Patch commits found, returning PATCH.");
            return CommitAnalyzerService.VERSION_LEVELS.PATCH;
        }

        // Default to patch for safety
        logger.verbose("CommitAnalyzerService: No significant changes, defaulting to PATCH.");
        return CommitAnalyzerService.VERSION_LEVELS.PATCH;
    }

    private buildRecommendation(
        level: 0 | 1 | 2,
        commits: readonly Commit[],
        analysis: CommitAnalysis
    ): BumperRecommendation {
        logger.verbose("CommitAnalyzerService: Building bumper recommendation object...");
        const recommendation = {
            level,
            releaseType: CommitAnalyzerService.RELEASE_TYPES[level],
            commits: [...commits],
            reason: this.generateAnalysisReason(analysis),
        };
        logger.verbose("CommitAnalyzerService: Recommendation object built.");
        return recommendation;
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
        const parts: string[] = [];

        if (analysis.breakingChanges > 0) {
            const plural = analysis.breakingChanges === 1 ? "" : "s";
            parts.push(`${analysis.breakingChanges} breaking change${plural}`);
        }

        if (analysis.scopedBreaking.length > 0) {
            parts.push(`breaking scope(s): ${analysis.scopedBreaking.join(", ")}`);
        }

        if (analysis.features > 0) {
            const plural = analysis.features === 1 ? "" : "s";
            parts.push(`${analysis.features} feature${plural}`);
        }

        if (analysis.patches > 0) {
            const plural = analysis.patches === 1 ? "" : "es";
            parts.push(`${analysis.patches} patch${plural}`);
        }

        if (analysis.hasPreReleaseTransition) {
            parts.push("pre-release transition detected");
        }

        if (parts.length === 0) {
            return "No significant changes detected";
        }

        return `Analysis found: ${parts.join(", ")}`;
    }
}
