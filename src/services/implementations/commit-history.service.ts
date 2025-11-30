import { FireflyOk, FireflyOkAsync, invalidErr } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import type { Commit, CommitNote, CommitReference } from "#/domain/commits/commit-types";
import { logger } from "#/infrastructure/logging";
import type { ICommitHistoryService } from "#/services/contracts/commit-history.interface";
import type { IGitService } from "#/services/contracts/git.interface";

const COMMIT_MESSAGE_PATTERNS = {
    /** Matches breaking change syntax: feat(scope)!: message */
    BREAKING: /^(\w*)(?:\((.*)\))?!: (.*)$/,
    /** Matches conventional commit: type(scope): message */
    CONVENTIONAL: /^(\w*)(?:\((.*)\))?: (.*)$/,
    /** Matches revert commits */
    REVERT: /^Revert "(.+)"\s*\[([a-f0-9]+)\]$/,
} as const;

const EXTRACTION_PATTERNS = {
    /** Matches BREAKING CHANGE notes in body */
    BREAKING_CHANGE: /BREAKING CHANGE:\s*(.+?)(?=\n\n|\n[A-Z]|$)/gs,
    /** Matches @mentions */
    MENTION: /@([a-zA-Z0-9_-]+)/g,
    /** Matches issue/PR references */
    REFERENCE: /(fixes?|closes?|resolves?)\s+#(\d+)|#(\d+)/gi,
} as const;

interface RawCommitDetails {
    readonly subject: string;
    readonly body: string;
    readonly author: string;
    readonly date: string;
    readonly notes: string;
}

function extractCommitFields(rawDetails: string): RawCommitDetails {
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

interface MessageAnalysis {
    readonly type: string | null;
    readonly scope: string | null;
    readonly subject: string | null;
}

function analyzeCommitMessage(subject: string): MessageAnalysis {
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

function extractRevertInfo(subject: string): Record<string, string | null> | null {
    const revertMatch = subject.match(COMMIT_MESSAGE_PATTERNS.REVERT);
    if (revertMatch) {
        return {
            header: revertMatch[1] ?? null,
            hash: revertMatch[2] ?? null,
        };
    }
    return null;
}

function extractBreakingChangeNotes(body: string, notes: string): CommitNote[] {
    const breakingNotes: CommitNote[] = [];
    const fullText = `${body}\n${notes}`;

    // Reset regex state
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

function extractMentions(text: string): string[] {
    const mentions: string[] = [];

    // Reset regex state
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

function extractReferences(text: string): CommitReference[] {
    const references: CommitReference[] = [];

    // Reset regex state
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

function parseCommitFromRaw(rawDetails: string, hash: string): FireflyResult<Commit> {
    if (!rawDetails || typeof rawDetails !== "string") {
        return invalidErr({
            message: `Invalid commit details for ${hash}`,
        });
    }

    const details = extractCommitFields(rawDetails);
    const messageAnalysis = analyzeCommitMessage(details.subject);
    const revertInfo = extractRevertInfo(details.subject);
    const breakingNotes = extractBreakingChangeNotes(details.body, details.notes);
    const mentions = extractMentions(details.body);
    const references = extractReferences(details.body);

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
 * Default implementation of the commit history service.
 * Uses IGitService to fetch and parse commit data.
 */
export class DefaultCommitHistoryService implements ICommitHistoryService {
    private readonly git: IGitService;

    constructor(git: IGitService) {
        this.git = git;
    }

    getCommitsSinceLastTag(): FireflyAsyncResult<Commit[]> {
        logger.verbose("CommitHistoryService: Retrieving commits since last tag");

        return this.git.getLastTag().andThen((lastTag) => {
            logger.verbose(`CommitHistoryService: Last tag is: ${lastTag ?? "none"}`);
            return this.getCommitsSince(lastTag);
        });
    }

    getAllCommits(): FireflyAsyncResult<Commit[]> {
        logger.verbose("CommitHistoryService: Retrieving all commits");
        return this.getCommitsSince(null);
    }

    getCommitsSince(since: string | null): FireflyAsyncResult<Commit[]> {
        logger.verbose(`CommitHistoryService: Fetching commits since ${since ?? "the beginning"}`);

        return this.git.getCommitHashesSince(since).andThen((hashes) => {
            if (hashes.length === 0) {
                logger.verbose("CommitHistoryService: No commits found");
                return FireflyOkAsync([]);
            }

            logger.verbose(`CommitHistoryService: Found ${hashes.length} commits`);
            return this.parseCommitHashes(hashes);
        });
    }

    async *streamCommits(since: string | null): AsyncGenerator<Commit, void, undefined> {
        logger.verbose(`CommitHistoryService: Streaming commits since ${since ?? "the beginning"}`);

        const hashesResult = await this.git.getCommitHashesSince(since);
        if (hashesResult.isErr()) {
            logger.verbose(`CommitHistoryService: Failed to get commit hashes: ${hashesResult.error.message}`);
            return;
        }

        const hashes = hashesResult.value;
        logger.verbose(`CommitHistoryService: Streaming ${hashes.length} commits`);

        for (const hash of hashes) {
            const detailsResult = await this.git.getCommitDetails(hash);
            if (detailsResult.isErr()) {
                logger.verbose(
                    `CommitHistoryService: Failed to get details for ${hash}: ${detailsResult.error.message}`
                );
                continue;
            }

            const parsed = parseCommitFromRaw(detailsResult.value, hash);
            if (parsed.isErr()) {
                logger.verbose(`CommitHistoryService: Failed to parse commit ${hash}: ${parsed.error.message}`);
                continue;
            }

            yield parsed.value;
        }
    }

    async *streamCommitsSinceLastTag(): AsyncGenerator<Commit, void, undefined> {
        const lastTagResult = await this.git.getLastTag();
        if (lastTagResult.isErr()) {
            logger.verbose(`CommitHistoryService: Failed to get last tag: ${lastTagResult.error.message}`);
            return;
        }

        yield* this.streamCommits(lastTagResult.value);
    }

    /**
     * Parses an array of commit hashes into full Commit objects.
     */
    private parseCommitHashes(hashes: string[]): FireflyAsyncResult<Commit[]> {
        return hashes.reduce<FireflyAsyncResult<Commit[]>>(
            (acc, hash) =>
                acc.andThen((commits) =>
                    this.git.getCommitDetails(hash).andThen((rawDetails) => {
                        const parsed = parseCommitFromRaw(rawDetails, hash);
                        if (parsed.isErr()) {
                            logger.verbose(
                                `CommitHistoryService: Failed to parse commit ${hash}: ${parsed.error.message}`
                            );
                            return FireflyOkAsync(commits);
                        }
                        return FireflyOkAsync([...commits, parsed.value]);
                    })
                ),
            FireflyOkAsync([])
        );
    }
}

/**
 * Creates a commit history service instance.
 * @param git - Git service for repository operations
 */
export function createCommitHistoryService(git: IGitService): ICommitHistoryService {
    return new DefaultCommitHistoryService(git);
}
