import { err, ok } from "neverthrow";
import { GitProvider } from "#/modules/git/git.provider";
import { logger } from "#/shared/logger";
import type { Commit } from "#/shared/types/commit.types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

interface CommitDetails {
    readonly subject: string;
    readonly body: string;
    readonly author: string;
    readonly date: string;
    readonly notes: string;
}

export class CommitHistoryService {
    private static readonly COMMIT_MESSAGE_PATTERNS = {
        BREAKING: /^(\w*)(?:\((.*)\))?!: (.*)$/,
        CONVENTIONAL: /^(\w*)(?:\((.*)\))?: (.*)$/,
        REVERT: /^Revert "(.+)"\s*\[([a-f0-9]+)\]$/,
    } as const;

    private static readonly EXTRACTION_PATTERNS = {
        BREAKING_CHANGE: /BREAKING CHANGE:\s*(.+?)(?=\n\n|\n[A-Z]|$)/gs,
        MENTION: /@([a-zA-Z0-9_-]+)/g,
        REFERENCE: /(fixes?|closes?|resolves?)\s+#(\d+)|#(\d+)/gi,
    } as const;

    private readonly gitProvider: GitProvider;

    constructor(gitProvider?: GitProvider) {
        this.gitProvider = gitProvider ?? GitProvider.getInstance();
    }

    async getCommitsSinceLastTag(): Promise<FireflyAsyncResult<Commit[]>> {
        logger.verbose("CommitHistoryService: Retrieving commits since last tag...");

        const lastTagResult = await this.gitProvider.history.lastTagOrNull();
        if (lastTagResult.isErr()) {
            return err(lastTagResult.error);
        }

        const lastTag = lastTagResult.value;
        logger.verbose(`CommitHistoryService: Last tag is: ${lastTag || "none"}`);

        const commitHashesResult = await this.gitProvider.history.commitsSince(lastTag);
        if (commitHashesResult.isErr()) {
            return err(commitHashesResult.error);
        }

        const commitHashes = commitHashesResult.value;
        logger.verbose(`CommitHistoryService: Found ${commitHashes.length} commits since last tag.`);

        if (commitHashes.length === 0) {
            logger.verbose("CommitHistoryService: No new commits found since last tag.");
            return ok([]);
        }

        const commitsResult = await this.parseCommitDetails(commitHashes);
        if (commitsResult.isErr()) {
            return err(commitsResult.error);
        }

        logger.verbose(`CommitHistoryService: Successfully parsed ${commitsResult.value.length} commits`);
        return ok(commitsResult.value);
    }

    async getAllCommits(): Promise<FireflyAsyncResult<Commit[]>> {
        logger.verbose("CommitHistoryService: Retrieving all commits...");

        const commitHashesResult = await this.gitProvider.history.commitsSince(null);
        if (commitHashesResult.isErr()) {
            return err(commitHashesResult.error);
        }

        const commitHashes = commitHashesResult.value;
        logger.verbose(`CommitHistoryService: Found ${commitHashes.length} total commits.`);

        if (commitHashes.length === 0) {
            logger.verbose("CommitHistoryService: No commits found in repository.");
            return ok([]);
        }

        const commitsResult = await this.parseCommitDetails(commitHashes);
        if (commitsResult.isErr()) {
            return err(commitsResult.error);
        }

        logger.verbose(`CommitHistoryService: Successfully parsed ${commitsResult.value.length} commits`);
        return ok(commitsResult.value);
    }

    private async parseCommitDetails(commitHashes: string[]): Promise<FireflyAsyncResult<Commit[]>> {
        const commits: Commit[] = [];
        const commitDetailsPromises = commitHashes.map(async (hash) => {
            const result = await this.gitProvider.history.commitDetails(hash, false);
            return { hash, result };
        });

        const commitDetailsResults = await Promise.all(commitDetailsPromises);

        for (const { hash, result } of commitDetailsResults) {
            if (result.isErr()) {
                return err(result.error);
            }

            const parsedCommit = this.parseCommitFromRaw(result.value, hash);
            if (parsedCommit.isErr()) {
                return err(parsedCommit.error);
            }

            commits.push(parsedCommit.value);
        }

        return ok(commits);
    }

    private parseCommitFromRaw(rawDetails: string, hash: string): FireflyResult<Commit> {
        if (!rawDetails || typeof rawDetails !== "string") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Invalid commit details for ${hash}`,
                    source: "CommitHistoryService.parseCommitFromRaw",
                }),
            );
        }

        const commitDetails = this.extractCommitFields(rawDetails);
        const messageAnalysis = this.analyzeCommitMessage(commitDetails.subject);
        const revertInfo = this.extractRevertInfo(commitDetails.subject);
        const breakingNotes = this.extractBreakingChangeNotes(commitDetails.body, commitDetails.notes);
        const mentions = this.extractMentions(commitDetails.body);
        const references = this.extractReferences(commitDetails.body);

        const commit: Commit = {
            hash,
            date: commitDetails.date || null,
            author: commitDetails.author || null,
            header: commitDetails.subject || null,
            body: commitDetails.body || null,
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

        return ok(commit);
    }

    private extractCommitFields(rawDetails: string): CommitDetails {
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
            subject: commitData.subject || "",
            body: commitData.body || "",
            author: commitData.author || "",
            date: commitData.date || "",
            notes: commitData.notes || "",
        };
    }

    private analyzeCommitMessage(subject: string): {
        type: string | null;
        scope: string | null;
        subject: string | null;
    } {
        const breakingMatch = subject.match(CommitHistoryService.COMMIT_MESSAGE_PATTERNS.BREAKING);
        if (breakingMatch) {
            return {
                type: breakingMatch[1] || null,
                scope: breakingMatch[2] || null,
                subject: breakingMatch[3] || null,
            };
        }

        const conventionalMatch = subject.match(CommitHistoryService.COMMIT_MESSAGE_PATTERNS.CONVENTIONAL);
        if (conventionalMatch) {
            return {
                type: conventionalMatch[1] || null,
                scope: conventionalMatch[2] || null,
                subject: conventionalMatch[3] || null,
            };
        }

        return {
            type: null,
            scope: null,
            subject: subject || null,
        };
    }

    private extractRevertInfo(subject: string): Record<string, string | null> | null {
        const revertMatch = subject.match(CommitHistoryService.COMMIT_MESSAGE_PATTERNS.REVERT);
        if (revertMatch) {
            return {
                header: revertMatch[1] || null,
                hash: revertMatch[2] || null,
            };
        }
        return null;
    }

    private extractBreakingChangeNotes(body: string, notes: string): Array<{ title: string; text: string }> {
        const breakingNotes: Array<{ title: string; text: string }> = [];
        const fullText = `${body}\n${notes}`;

        let match = CommitHistoryService.EXTRACTION_PATTERNS.BREAKING_CHANGE.exec(fullText);
        while (match !== null) {
            const text = match[1];
            if (text) {
                breakingNotes.push({
                    title: "BREAKING CHANGE",
                    text: text.trim(),
                });
            }
            match = CommitHistoryService.EXTRACTION_PATTERNS.BREAKING_CHANGE.exec(fullText);
        }

        return breakingNotes;
    }

    private extractMentions(text: string): string[] {
        const mentions: string[] = [];
        let match = CommitHistoryService.EXTRACTION_PATTERNS.MENTION.exec(text);

        while (match !== null) {
            const mention = match[1];
            if (mention) {
                mentions.push(mention);
            }
            match = CommitHistoryService.EXTRACTION_PATTERNS.MENTION.exec(text);
        }

        return mentions;
    }

    private extractReferences(text: string): Array<{
        raw: string;
        action: string | null;
        owner: string | null;
        repository: string | null;
        issue: string;
        prefix: string;
    }> {
        const references: Array<{
            raw: string;
            action: string | null;
            owner: string | null;
            repository: string | null;
            issue: string;
            prefix: string;
        }> = [];

        let match = CommitHistoryService.EXTRACTION_PATTERNS.REFERENCE.exec(text);
        while (match !== null) {
            const action = match[1] || null;
            const issue = match[2] || match[3];

            if (issue) {
                references.push({
                    raw: match[0],
                    action: action?.toLowerCase() || null,
                    owner: null,
                    repository: null,
                    issue,
                    prefix: "#",
                });
            }
            match = CommitHistoryService.EXTRACTION_PATTERNS.REFERENCE.exec(text);
        }

        return references;
    }
}
