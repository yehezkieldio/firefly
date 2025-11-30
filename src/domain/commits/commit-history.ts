import { FireflyOk, FireflyOkAsync, invalidErr } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import type { Commit, CommitNote, CommitReference } from "#/domain/commits/commit-types";
import { executeGitCommand } from "#/infrastructure/executors/git-command.executor";
import { logger } from "#/infrastructure/logging";

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

export function getLastTag(cwd?: string): FireflyAsyncResult<string | null> {
    logger.verbose("CommitHistory: Fetching last tag");

    return executeGitCommand(["describe", "--tags", "--abbrev=0"], { cwd, verbose: false })
        .map((output) => {
            const tag = output.trim();
            logger.verbose(`CommitHistory: Last tag found - ${tag}`);
            return tag || null;
        })
        .orElse((error) => {
            // If no tags found, return null instead of error
            if (error.message.includes("No names found") || error.message.includes("fatal")) {
                logger.verbose("CommitHistory: No tags found in repository");
                return FireflyOkAsync(null);
            }
            return FireflyOkAsync(null);
        });
}

export function getCommitHashesSince(since: string | null, cwd?: string): FireflyAsyncResult<string[]> {
    logger.verbose(`CommitHistory: Fetching commits since ${since ?? "the beginning"}`);

    const args = since ? ["rev-list", `${since}..HEAD`] : ["rev-list", "HEAD"];

    return executeGitCommand(args, { cwd, verbose: false }).map((output) => {
        const commits = output
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        logger.verbose(`CommitHistory: Found ${commits.length} commits since ${since ?? "the beginning"}`);
        return commits;
    });
}

export function getCommitDetails(hash: string, cwd?: string): FireflyAsyncResult<string> {
    const format = ["hash:%H", "date:%ci", "author:%an <%ae>", "subject:%s", "body:%b", "notes:%N"].join("%n");

    return executeGitCommand(["show", "--no-patch", `--format=${format}`, hash], { cwd, verbose: false });
}

export function getCommitsSinceLastTag(cwd?: string): FireflyAsyncResult<Commit[]> {
    logger.verbose("CommitHistory: Retrieving commits since last tag");

    return getLastTag(cwd).andThen((lastTag) => {
        logger.verbose(`CommitHistory: Last tag is: ${lastTag ?? "none"}`);

        return getCommitHashesSince(lastTag, cwd).andThen((hashes) => {
            if (hashes.length === 0) {
                logger.verbose("CommitHistory: No new commits found since last tag");
                return FireflyOkAsync([]);
            }

            return parseCommitHashes(hashes, cwd);
        });
    });
}

export function getAllCommits(cwd?: string): FireflyAsyncResult<Commit[]> {
    logger.verbose("CommitHistory: Retrieving all commits");

    return getCommitHashesSince(null, cwd).andThen((hashes) => {
        if (hashes.length === 0) {
            logger.verbose("CommitHistory: No commits found in repository");
            return FireflyOkAsync([]);
        }

        return parseCommitHashes(hashes, cwd);
    });
}

export function hasAnyTags(cwd?: string): FireflyAsyncResult<boolean> {
    return getLastTag(cwd).map((tag) => tag !== null);
}

export async function* streamCommits(since: string | null, cwd?: string): AsyncGenerator<Commit, void, undefined> {
    logger.verbose(`CommitHistory: Streaming commits since ${since ?? "the beginning"}`);

    const hashesResult = await getCommitHashesSince(since, cwd);
    if (hashesResult.isErr()) {
        logger.verbose(`CommitHistory: Failed to get commit hashes: ${hashesResult.error.message}`);
        return;
    }

    const hashes = hashesResult.value;
    logger.verbose(`CommitHistory: Streaming ${hashes.length} commits`);

    for (const hash of hashes) {
        const detailsResult = await getCommitDetails(hash, cwd);
        if (detailsResult.isErr()) {
            logger.verbose(`CommitHistory: Failed to get details for ${hash}: ${detailsResult.error.message}`);
            continue;
        }

        const parsed = parseCommitFromRaw(detailsResult.value, hash);
        if (parsed.isErr()) {
            logger.verbose(`CommitHistory: Failed to parse commit ${hash}: ${parsed.error.message}`);
            continue;
        }

        yield parsed.value;
    }
}

export async function* streamCommitsSinceLastTag(cwd?: string): AsyncGenerator<Commit, void, undefined> {
    const lastTagResult = await getLastTag(cwd);
    if (lastTagResult.isErr()) {
        logger.verbose(`CommitHistory: Failed to get last tag: ${lastTagResult.error.message}`);
        return;
    }

    yield* streamCommits(lastTagResult.value, cwd);
}

/**
 * Parses an array of commit hashes into full Commit objects.
 */
function parseCommitHashes(hashes: string[], cwd?: string): FireflyAsyncResult<Commit[]> {
    // Process commits sequentially to avoid overwhelming git
    return hashes.reduce<FireflyAsyncResult<Commit[]>>(
        (acc, hash) =>
            acc.andThen((commits) =>
                getCommitDetails(hash, cwd).andThen((rawDetails) => {
                    const parsed = parseCommitFromRaw(rawDetails, hash);
                    if (parsed.isErr()) {
                        // Log but continue with other commits
                        logger.verbose(`CommitHistory: Failed to parse commit ${hash}: ${parsed.error.message}`);
                        return FireflyOkAsync(commits);
                    }
                    return FireflyOkAsync([...commits, parsed.value]);
                })
            ),
        FireflyOkAsync([])
    );
}
