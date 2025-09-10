import { err, ok } from "neverthrow";
import { logger } from "#/shared/logger";
import type { Commit } from "#/shared/types/commit.types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

interface CommitAnalysis {
    readonly breakingChanges: number;
    readonly features: number;
    readonly patches: number;
    readonly scopedBreaking: string[];
    readonly hasPreReleaseTransition: boolean;
    readonly commitsByType: Record<string, Commit[]>;
}

interface CommitTypeConfiguration {
    readonly major: readonly string[];
    readonly minor: readonly string[];
    readonly patch: readonly string[];
    readonly scopeRules: Readonly<Record<string, "major" | "minor" | "patch">>;
}

interface VersionRecommendation {
    readonly level: 0 | 1 | 2;
    readonly releaseType: "major" | "minor" | "patch";
    readonly commits: readonly Commit[];
    readonly reason: string;
    readonly analysis: CommitAnalysis;
}

export class SemanticVersionAnalyzer {
    private static readonly VERSION_LEVELS = {
        MAJOR: 0,
        MINOR: 1,
        PATCH: 2,
    } as const;

    private static readonly RELEASE_TYPES = {
        [SemanticVersionAnalyzer.VERSION_LEVELS.MAJOR]: "major",
        [SemanticVersionAnalyzer.VERSION_LEVELS.MINOR]: "minor",
        [SemanticVersionAnalyzer.VERSION_LEVELS.PATCH]: "patch",
    } as const;

    private static readonly DEFAULT_CONFIGURATION: CommitTypeConfiguration = {
        major: ["revert"],
        minor: ["feat", "feature"],
        patch: ["fix", "perf", "refactor", "style", "test", "build", "ci", "chore", "docs", "security"],
        scopeRules: {
            deps: "patch",
            dependencies: "patch",
            security: "patch",
            api: "minor",
            breaking: "major",
            "breaking-change": "major",
        },
    };

    private static readonly TRANSITION_KEYWORDS = [
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

    private static readonly PATTERN_MATCHERS = {
        BREAKING_HEADER: /^[a-zA-Z]+(?:\([^)]*\))?!:/,
        SCOPE_HEADER: /^[a-zA-Z]+\(([^)]+)\)[:!]/,
    } as const;

    private readonly configuration: CommitTypeConfiguration;

    constructor(configuration: Partial<CommitTypeConfiguration> = {}) {
        this.configuration = this.mergeConfiguration(configuration);
    }

    analyzeCommits(commits: readonly Commit[]): FireflyResult<VersionRecommendation> {
        logger.verbose("SemanticVersionAnalyzer: Starting commit analysis for version recommendation...");
        const startTime = Date.now();

        const validationResult = this.validateCommitsInput(commits);
        if (validationResult.isErr()) {
            return err(validationResult.error);
        }

        if (commits.length === 0) {
            logger.verbose("SemanticVersionAnalyzer: No commits provided, returning patch recommendation.");
            return ok(this.createDefaultPatchRecommendation([]));
        }

        logger.verbose(`SemanticVersionAnalyzer: Analyzing ${commits.length} commits...`);

        const analysis = this.performDetailedAnalysis(commits);
        const versionLevel = this.determineVersionLevel(analysis);
        const recommendation = this.buildVersionRecommendation(versionLevel, commits, analysis);

        const duration = Date.now() - startTime;
        logger.verbose(
            `SemanticVersionAnalyzer: Analysis completed in ${duration}ms. Recommendation: ${recommendation.releaseType}`,
        );

        return ok(recommendation);
    }

    private mergeConfiguration(partial: Partial<CommitTypeConfiguration>): CommitTypeConfiguration {
        return {
            major: [...SemanticVersionAnalyzer.DEFAULT_CONFIGURATION.major, ...(partial.major ?? [])],
            minor: [...SemanticVersionAnalyzer.DEFAULT_CONFIGURATION.minor, ...(partial.minor ?? [])],
            patch: [...SemanticVersionAnalyzer.DEFAULT_CONFIGURATION.patch, ...(partial.patch ?? [])],
            scopeRules: {
                ...SemanticVersionAnalyzer.DEFAULT_CONFIGURATION.scopeRules,
                ...partial.scopeRules,
            },
        };
    }

    private validateCommitsInput(commits: readonly Commit[]): FireflyResult<void> {
        if (!Array.isArray(commits)) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Commits input must be an array",
                    source: "SemanticVersionAnalyzer.validateCommitsInput",
                }),
            );
        }
        return ok(undefined);
    }

    private performDetailedAnalysis(commits: readonly Commit[]): CommitAnalysis {
        logger.verbose("SemanticVersionAnalyzer: Performing detailed commit analysis...");

        const commitsByType: Record<string, Commit[]> = {};

        const analysis = commits.reduce(
            (acc: CommitAnalysis, commit: Commit): CommitAnalysis => {
                const type = commit.type?.toLowerCase() || "unknown";
                if (!acc.commitsByType[type]) {
                    acc.commitsByType[type] = [];
                }
                acc.commitsByType[type].push(commit);

                return {
                    breakingChanges: acc.breakingChanges + this.countBreakingChanges(commit),
                    features: acc.features + (this.isFeatureCommit(commit) ? 1 : 0),
                    patches: acc.patches + (this.isPatchCommit(commit) ? 1 : 0),
                    scopedBreaking: [...acc.scopedBreaking, ...this.analyzeScopeBreaking(commit)],
                    hasPreReleaseTransition: acc.hasPreReleaseTransition || this.detectPreReleaseTransition(commit),
                    commitsByType: acc.commitsByType,
                };
            },
            {
                breakingChanges: 0,
                features: 0,
                patches: 0,
                scopedBreaking: [],
                hasPreReleaseTransition: false,
                commitsByType,
            },
        );

        logger.verbose(
            `SemanticVersionAnalyzer: Analysis results - Breaking: ${analysis.breakingChanges}, Features: ${analysis.features}, Patches: ${analysis.patches}`,
        );

        return analysis;
    }

    private countBreakingChanges(commit: Commit): number {
        let breakingCount = 0;

        // Count breaking change notes
        breakingCount += commit.notes?.length ?? 0;

        // Check for breaking change header indicator (!)
        if (this.hasBreakingHeader(commit)) {
            breakingCount += 1;
        }

        return breakingCount;
    }

    private hasBreakingHeader(commit: Commit): boolean {
        if (!commit.header) return false;
        return SemanticVersionAnalyzer.PATTERN_MATCHERS.BREAKING_HEADER.test(commit.header);
    }

    private isFeatureCommit(commit: Commit): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return this.configuration.minor.includes(type);
    }

    private isPatchCommit(commit: Commit): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return this.configuration.patch.includes(type);
    }

    private analyzeScopeBreaking(commit: Commit): string[] {
        const scope = this.extractCommitScope(commit);
        if (!scope) return [];

        const scopeRule = this.configuration.scopeRules[scope.toLowerCase()];
        if (scopeRule === "major") {
            return [scope];
        }

        return [];
    }

    private extractCommitScope(commit: Commit): string | null {
        // First check if scope is directly available
        if (commit.scope) {
            return commit.scope;
        }

        // Extract from header using pattern matching
        if (commit.header) {
            const match = commit.header.match(SemanticVersionAnalyzer.PATTERN_MATCHERS.SCOPE_HEADER);
            return match?.[1] ?? null;
        }

        return null;
    }

    private detectPreReleaseTransition(commit: Commit): boolean {
        const message = commit.header?.toLowerCase() ?? "";
        const body = commit.body?.toLowerCase() ?? "";

        return SemanticVersionAnalyzer.TRANSITION_KEYWORDS.some(
            (keyword) => message.includes(keyword) || body.includes(keyword),
        );
    }

    private determineVersionLevel(analysis: CommitAnalysis): 0 | 1 | 2 {
        logger.verbose("SemanticVersionAnalyzer: Determining version level from analysis...");

        // Breaking changes always result in major version bump
        if (analysis.breakingChanges > 0 || analysis.scopedBreaking.length > 0) {
            logger.verbose("SemanticVersionAnalyzer: Breaking changes detected, recommending MAJOR version bump.");
            return SemanticVersionAnalyzer.VERSION_LEVELS.MAJOR;
        }

        // Feature commits result in minor version bump
        if (analysis.features > 0) {
            logger.verbose("SemanticVersionAnalyzer: New features detected, recommending MINOR version bump.");
            return SemanticVersionAnalyzer.VERSION_LEVELS.MINOR;
        }

        // Patch-level commits result in patch version bump
        if (analysis.patches > 0) {
            logger.verbose("SemanticVersionAnalyzer: Patch-level changes detected, recommending PATCH version bump.");
            return SemanticVersionAnalyzer.VERSION_LEVELS.PATCH;
        }

        // Default to patch for safety when no significant changes are detected
        logger.verbose("SemanticVersionAnalyzer: No significant changes detected, defaulting to PATCH version bump.");
        return SemanticVersionAnalyzer.VERSION_LEVELS.PATCH;
    }

    private buildVersionRecommendation(
        level: 0 | 1 | 2,
        commits: readonly Commit[],
        analysis: CommitAnalysis,
    ): VersionRecommendation {
        logger.verbose("SemanticVersionAnalyzer: Building version recommendation...");

        return {
            level,
            releaseType: SemanticVersionAnalyzer.RELEASE_TYPES[level],
            commits: [...commits],
            reason: this.generateRecommendationReason(analysis),
            analysis,
        };
    }

    private createDefaultPatchRecommendation(commits: readonly Commit[]): VersionRecommendation {
        const emptyAnalysis: CommitAnalysis = {
            breakingChanges: 0,
            features: 0,
            patches: 0,
            scopedBreaking: [],
            hasPreReleaseTransition: false,
            commitsByType: {},
        };

        return {
            level: SemanticVersionAnalyzer.VERSION_LEVELS.PATCH,
            releaseType: "patch",
            commits: [...commits],
            reason: "No commits provided, defaulting to patch increment for safety",
            analysis: emptyAnalysis,
        };
    }

    private generateRecommendationReason(analysis: CommitAnalysis): string {
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
}
