import { invalidError } from "#/core/result/error.factories";
import { FireflyErr, FireflyOk, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import type {
    Commit,
    CommitAnalysis,
    CommitNote,
    CommitReference,
    CommitTypeConfiguration,
    RawCommitDetails,
} from "#/domain/commits/commit-types";
import { DEFAULT_COMMIT_TYPE_CONFIG } from "#/domain/commits/commit-types";
import { logger } from "#/infrastructure/logging";
import type { CommitAnalysisOptions, ICommitAnalysisService } from "#/services/contracts/commit-analysis.interface";
import type { IGitService } from "#/services/contracts/git.interface";
import type {
    VersionLevel,
    VersionRecommendation as VersionRec,
    VersionRecommendation,
} from "#/services/contracts/version-strategy.interface";
import { TRANSITION_KEYWORDS } from "./version-strategy.service";

const COMMIT_MESSAGE_PATTERNS = {
    /**
     * Matches breaking change syntax: feat(scope)!: message
     */
    BREAKING: /^(\w*)(?:\((.*)\))?!: (.*)$/,

    /**
     * Matches conventional commit: type(scope): message
     */
    CONVENTIONAL: /^(\w*)(?:\((.*)\))?: (.*)$/,

    /**
     * Matches revert commits
     */
    REVERT: /^Revert "(.+)"\s*\[([a-f0-9]+)\]$/,
} as const;

const EXTRACTION_PATTERNS = {
    /**
     * Matches BREAKING CHANGE notes in body
     */
    BREAKING_CHANGE: /BREAKING CHANGE:\s*(.+?)(?=\n\n|\n[A-Z]|$)/gs,

    /**
     * Matches @mentions
     */
    MENTION: /@([a-zA-Z0-9_-]+)/g,

    /**
     * Matches issue/PR references
     */
    REFERENCE: /(fixes?|closes?|resolves?)\s+#(\d+)|#(\d+)/gi,
} as const;

const ANALYSIS_PATTERNS = {
    /**
     * Matches breaking change syntax: feat(scope)!: message
     */
    BREAKING_HEADER: /^[a-zA-Z]+(?:\([^)]*\))?!:/,

    /**
     * Matches scope in conventional commit
     */
    SCOPE_HEADER: /^[a-zA-Z]+\(([^)]+)\)[:!]/,
} as const;

const VERSION_LEVELS = {
    MAJOR: 0 as VersionLevel,
    MINOR: 1 as VersionLevel,
    PATCH: 2 as VersionLevel,
} as const;

const LEVEL_TO_RELEASE_TYPE = {
    0: "major",
    1: "minor",
    2: "patch",
} as const;

interface MessageAnalysis {
    readonly type: string | null;
    readonly scope: string | null;
    readonly subject: string | null;
}

export class DefaultCommitAnalysisService implements ICommitAnalysisService {
    private readonly git: IGitService;

    constructor(git: IGitService) {
        this.git = git;
    }

    analyzeForVersion(options?: CommitAnalysisOptions): FireflyAsyncResult<VersionRec> {
        logger.verbose("CommitAnalysisService: Starting commit analysis for version recommendation...");
        const startTime = Date.now();

        return this.getCommitsSinceLastTag().map((commits) => {
            if (commits.length === 0) {
                logger.verbose("CommitAnalysisService: No commits provided, returning patch recommendation.");
                return this.createDefaultPatchRecommendation();
            }

            const config = this.mergeConfiguration(options?.config ?? {});
            const analysis = this.performDetailedAnalysis(commits, config);
            const versionLevel = this.determineVersionLevel(analysis);
            const recommendation = this.buildVersionRecommendation(versionLevel, analysis);

            const duration = Date.now() - startTime;
            logger.verbose(
                `CommitAnalysisService: Analysis completed in ${duration}ms. Recommendation: ${recommendation.releaseType}`
            );

            return recommendation;
        });
    }

    createDefaultRecommendation(): VersionRecommendation {
        return this.createDefaultPatchRecommendation();
    }

    /**
     * Retrieves commits since the last tag without analysis.
     *
     * @returns Array of parsed commits
     */
    private getCommitsSinceLastTag(): FireflyAsyncResult<Commit[]> {
        logger.verbose("CommitAnalysisService: Retrieving commits since last tag");

        return this.git.getLatestTag().andThen((lastTag) => {
            logger.verbose(`CommitAnalysisService: Last tag is: ${lastTag ?? "none"}`);

            return this.git.getCommitHashesSince(lastTag).andThen((hashes) => {
                if (hashes.length === 0) {
                    logger.verbose("CommitAnalysisService: No new commits found since last tag");
                    return FireflyOkAsync([]);
                }

                return this.parseCommitHashes(hashes);
            });
        });
    }

    /**
     * Extracts commit fields from raw commit details.
     *
     * @param rawDetails - The raw commit details string
     * @returns An object containing extracted commit fields
     */
    private extractCommitFields(rawDetails: string): RawCommitDetails {
        const lines = rawDetails.trim().split("\n");
        const commitData: Record<string, string> = {};

        for (const line of lines) {
            const colonIndex = line.indexOf(":");
            if (colonIndex === -1) continue;

            const key = line.substring(0, colonIndex);
            const value = line.substring(colonIndex + 1);
            commitData[key] = value;
        }

        return {
            subject: commitData.subject ?? "",
            body: commitData.body ?? "",
            author: commitData.author ?? "",
            date: commitData.date ?? "",
            notes: commitData.notes ?? "",
        };
    }

    /**
     * Analyzes the commit message to extract type, scope, and subject.
     *
     * @param subject - The commit subject line
     * @returns An object with type, scope, and subject
     */
    private analyzeCommitMessage(subject: string): MessageAnalysis {
        const breakingMatch = subject.match(COMMIT_MESSAGE_PATTERNS.BREAKING);
        if (breakingMatch) {
            return {
                type: breakingMatch[1] ?? null,
                scope: breakingMatch[2] ?? null,
                subject: breakingMatch[3] ?? null,
            };
        }

        const conventionalMatch = subject.match(COMMIT_MESSAGE_PATTERNS.CONVENTIONAL);
        if (conventionalMatch) {
            return {
                type: conventionalMatch[1] ?? null,
                scope: conventionalMatch[2] ?? null,
                subject: conventionalMatch[3] ?? null,
            };
        }

        return { type: null, scope: null, subject: subject || null };
    }

    /**
     * Extracts revert information from commit subject.
     *
     * @param subject - The commit subject line
     * @returns An object with revert header and hash, or null if not a revert
     */
    private extractRevertInfo(subject: string): Record<string, string | null> | null {
        const revertMatch = subject.match(COMMIT_MESSAGE_PATTERNS.REVERT);
        if (revertMatch) {
            return {
                header: revertMatch[1] ?? null,
                hash: revertMatch[2] ?? null,
            };
        }
        return null;
    }

    /**
     * Extracts BREAKING CHANGE notes from commit body and notes.
     *
     * @param body - The commit body text
     * @param notes - The commit notes text
     * @returns An array of CommitNote objects
     */
    private extractBreakingChangeNotes(body: string, notes: string): CommitNote[] {
        const breakingNotes: CommitNote[] = [];
        const fullText = `${body}\n${notes}`;

        EXTRACTION_PATTERNS.BREAKING_CHANGE.lastIndex = 0;

        let match = EXTRACTION_PATTERNS.BREAKING_CHANGE.exec(fullText);
        while (match !== null) {
            const text = match[1];
            if (text) {
                breakingNotes.push({
                    title: "BREAKING CHANGE",
                    text: text.trim(),
                });
            }
            match = EXTRACTION_PATTERNS.BREAKING_CHANGE.exec(fullText);
        }

        return breakingNotes;
    }

    /**
     * Extracts @mentions from commit text.
     *
     * @param text - The commit text to analyze
     * @returns An array of mention strings
     */
    private extractMentions(text: string): string[] {
        const mentions: string[] = [];

        EXTRACTION_PATTERNS.MENTION.lastIndex = 0;

        let match = EXTRACTION_PATTERNS.MENTION.exec(text);
        while (match !== null) {
            const mention = match[1];
            if (mention) {
                mentions.push(mention);
            }
            match = EXTRACTION_PATTERNS.MENTION.exec(text);
        }

        return mentions;
    }

    /**
     * Extracts issue/PR references from commit text.
     *
     * @param text - The commit text to analyze
     * @returns An array of CommitReference objects
     */
    private extractReferences(text: string): CommitReference[] {
        const references: CommitReference[] = [];

        EXTRACTION_PATTERNS.REFERENCE.lastIndex = 0;

        let match = EXTRACTION_PATTERNS.REFERENCE.exec(text);
        while (match !== null) {
            const action = match[1] ?? null;
            const issue = match[2] ?? match[3];

            if (issue) {
                references.push({
                    raw: match[0],
                    action: action?.toLowerCase() ?? null,
                    owner: null,
                    repository: null,
                    issue,
                    prefix: "#",
                });
            }
            match = EXTRACTION_PATTERNS.REFERENCE.exec(text);
        }

        return references;
    }

    /**
     * Parses raw commit details into a Commit object.
     *
     * @param rawDetails - The raw commit details string
     * @param hash - The commit hash
     * @returns A FireflyResult containing the parsed Commit object
     */
    private parseCommitFromRaw(rawDetails: string, hash: string): FireflyResult<Commit> {
        if (!rawDetails || typeof rawDetails !== "string") {
            return FireflyErr(
                invalidError({
                    message: `Invalid commit details for ${hash}`,
                })
            );
        }

        const details = this.extractCommitFields(rawDetails);
        const messageAnalysis = this.analyzeCommitMessage(details.subject);
        const revertInfo = this.extractRevertInfo(details.subject);
        const breakingNotes = this.extractBreakingChangeNotes(details.body, details.notes);
        const mentions = this.extractMentions(details.body);
        const references = this.extractReferences(details.body);

        const commit: Commit = {
            hash,
            date: details.date || null,
            author: details.author || null,
            header: details.subject || null,
            body: details.body || null,
            footer: null,
            type: messageAnalysis.type,
            scope: messageAnalysis.scope,
            subject: messageAnalysis.subject,
            merge: null,
            revert: revertInfo,
            notes: breakingNotes,
            mentions,
            references,
        };

        return FireflyOk(commit);
    }

    /**
     * Parses a list of commit hashes into Commit objects.
     *
     * @param hashes - The list of commit hashes to parse
     * @returns A FireflyAsyncResult containing the list of parsed Commit objects
     */
    private parseCommitHashes(hashes: string[]): FireflyAsyncResult<Commit[]> {
        return hashes.reduce<FireflyAsyncResult<Commit[]>>(
            (acc, hash) =>
                acc.andThen((commits) =>
                    this.git.getCommitDetails(hash).andThen((rawDetails) => {
                        const parsed = this.parseCommitFromRaw(rawDetails, hash);
                        if (parsed.isErr()) {
                            logger.verbose(
                                `CommitAnalysisService: Failed to parse commit ${hash}: ${parsed.error.message}`
                            );
                            return FireflyOkAsync(commits);
                        }
                        return FireflyOkAsync([...commits, parsed.value]);
                    })
                ),
            FireflyOkAsync([])
        );
    }

    /**
     * Merges user-provided commit type configuration with defaults.
     *
     * @param partial - Partial commit type configuration from user
     * @returns Complete commit type configuration
     */
    private mergeConfiguration(partial: Partial<CommitTypeConfiguration>): CommitTypeConfiguration {
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

    /**
     * Determines if the commit header indicates a breaking change.
     *
     * @param commit - The commit to analyze
     * @returns True if the header indicates a breaking change, false otherwise
     */
    private hasBreakingHeader(commit: Commit): boolean {
        if (!commit.header) return false;
        return ANALYSIS_PATTERNS.BREAKING_HEADER.test(commit.header);
    }

    /**
     * Counts the number of breaking changes in a commit.
     *
     * @param commit - The commit to analyze
     * @returns The number of breaking changes found
     */
    private countBreakingChanges(commit: Commit): number {
        let breakingCount = 0;
        breakingCount += commit.notes?.length ?? 0;

        if (this.hasBreakingHeader(commit)) {
            breakingCount += 1;
        }

        return breakingCount;
    }

    /**
     * Determines if the commit is a feature commit.
     *
     * @param commit - The commit to analyze
     * @param config - The commit type configuration
     * @returns True if the commit is a feature commit, false otherwise
     */
    private isFeatureCommit(commit: Commit, config: CommitTypeConfiguration): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return config.minor.includes(type);
    }

    /**
     * Determines if the commit is a patch-level commit.
     *
     * @param commit - The commit to analyze
     * @param config - The commit type configuration
     * @returns True if the commit is a patch-level commit, false otherwise
     */
    private isPatchCommit(commit: Commit, config: CommitTypeConfiguration): boolean {
        const type = commit.type?.toLowerCase() ?? "";
        return config.patch.includes(type);
    }

    /**
     * Extracts the scope from a commit.
     *
     * @param commit - The commit to extract the scope from
     * @returns The extracted scope or null if not found
     */
    private extractCommitScope(commit: Commit): string | null {
        if (commit.scope) {
            return commit.scope;
        }

        if (commit.header) {
            const match = commit.header.match(ANALYSIS_PATTERNS.SCOPE_HEADER);
            return match?.[1] ?? null;
        }

        return null;
    }

    /**
     * Analyzes the commit scope for breaking changes based on configuration.
     *
     * @param commit - The commit to analyze
     * @param config - The commit type configuration
     * @returns An array of scopes that indicate breaking changes
     */
    private analyzeScopeBreaking(commit: Commit, config: CommitTypeConfiguration): string[] {
        const scope = this.extractCommitScope(commit);
        if (!scope) return [];

        const scopeRule = config.scopeRules[scope.toLowerCase()];
        if (scopeRule === "major") {
            return [scope];
        }

        return [];
    }

    /**
     * Detects if the commit indicates a pre-release to stable transition.
     *
     * @param commit - The commit to analyze
     * @returns True if a transition is detected, false otherwise
     */
    private detectPreReleaseTransition(commit: Commit): boolean {
        const message = commit.header?.toLowerCase() ?? "";
        const body = commit.body?.toLowerCase() ?? "";

        return TRANSITION_KEYWORDS.some((keyword) => message.includes(keyword) || body.includes(keyword));
    }

    /**
     * Performs a detailed analysis of the commits to determine their impact on versioning.
     *
     * @param commits - The list of commits to analyze
     * @param config - The commit type configuration
     * @returns The detailed commit analysis
     */
    private performDetailedAnalysis(commits: readonly Commit[], config: CommitTypeConfiguration): CommitAnalysis {
        logger.verbose("CommitAnalysisService: Performing detailed commit analysis...");

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

            const updatedCommitsByType = { ...acc.commitsByType };
            if (!updatedCommitsByType[type]) {
                updatedCommitsByType[type] = [];
            }
            updatedCommitsByType[type] = [...updatedCommitsByType[type], commit];

            return {
                breakingChanges: acc.breakingChanges + this.countBreakingChanges(commit),
                features: acc.features + (this.isFeatureCommit(commit, config) ? 1 : 0),
                patches: acc.patches + (this.isPatchCommit(commit, config) ? 1 : 0),
                scopedBreaking: [...acc.scopedBreaking, ...this.analyzeScopeBreaking(commit, config)],
                hasPreReleaseTransition: acc.hasPreReleaseTransition || this.detectPreReleaseTransition(commit),
                commitsByType: updatedCommitsByType,
            };
        }, initialAnalysis);

        logger.verbose(
            `CommitAnalysisService: Analysis results - Breaking: ${analysis.breakingChanges}, ` +
                `Features: ${analysis.features}, Patches: ${analysis.patches}`
        );

        return analysis;
    }

    /**
     * Determines the version level based on the commit analysis.
     *
     * @param analysis - The detailed commit analysis
     * @returns The recommended version level
     */
    private determineVersionLevel(analysis: CommitAnalysis): VersionLevel {
        logger.verbose("CommitAnalysisService: Determining version level from analysis...");

        if (analysis.breakingChanges > 0 || analysis.scopedBreaking.length > 0) {
            logger.verbose("CommitAnalysisService: Breaking changes detected, recommending MAJOR version bump.");
            return VERSION_LEVELS.MAJOR;
        }

        if (analysis.features > 0) {
            logger.verbose("CommitAnalysisService: New features detected, recommending MINOR version bump.");
            return VERSION_LEVELS.MINOR;
        }

        if (analysis.patches > 0) {
            logger.verbose("CommitAnalysisService: Patch-level changes detected, recommending PATCH version bump.");
            return VERSION_LEVELS.PATCH;
        }

        logger.verbose("CommitAnalysisService: No significant changes detected, defaulting to PATCH version bump.");
        return VERSION_LEVELS.PATCH;
    }

    /**
     * Generates a human-readable reason for the version recommendation.
     *
     * @param analysis - The detailed commit analysis
     * @returns A string explaining the recommendation
     */
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

    /**
     * Creates a default patch recommendation when no commits are provided.
     *
     * @returns The default version recommendation
     */
    private createDefaultPatchRecommendation(): VersionRecommendation {
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
            reason: "No commits provided, defaulting to patch increment for safety",
            analysis: emptyAnalysis,
        };
    }

    /**
     * Builds the final version recommendation object.
     *
     * @param level - The determined version level
     * @param analysis - The detailed commit analysis
     * @returns The version recommendation
     */
    private buildVersionRecommendation(level: VersionLevel, analysis: CommitAnalysis): VersionRecommendation {
        logger.verbose("CommitAnalysisService: Building version recommendation...");

        return {
            level,
            releaseType: LEVEL_TO_RELEASE_TYPE[level],
            reason: this.generateRecommendationReason(analysis),
            analysis,
        };
    }
}

/**
 * Creates a commit analysis service instance.
 * @param git - The Git service to use
 */
export function createCommitAnalysisService(git: IGitService): ICommitAnalysisService {
    return new DefaultCommitAnalysisService(git);
}
