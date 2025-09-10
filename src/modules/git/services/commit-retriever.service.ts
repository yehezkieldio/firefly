import { err, ok } from "neverthrow";
import { GitProvider } from "#/modules/git/git.provider";
import { logger } from "#/shared/logger";
import type { Commit } from "#/shared/types/commit.types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class CommitRetrieverService {
    private static readonly COMMIT_MESSAGE_PATTERN = /^(\w*)(?:\((.*)\))?: (.*)$/;
    private static readonly BREAKING_PATTERN = /^(\w*)(?:\((.*)\))?!: (.*)$/;
    private static readonly REVERT_PATTERN = /^Revert "(.+)"\s*\[([a-f0-9]+)\]$/;
    private readonly gitProvider = new GitProvider();

    async getCommitsSinceLastTag(): Promise<FireflyResult<Commit[]>> {
        logger.verbose("CommitRetrieverService: Retrieving commits since last tag...");

        // Get the last tag
        const lastTagResult = await this.gitProvider.history.lastTagOrNull();
        if (lastTagResult.isErr()) {
            return err(lastTagResult.error);
        }

        const lastTag = lastTagResult.value;

        if (lastTag === null) {
            logger.verbose("No tags found in the repository. Retrieving all commits.");
        }

        logger.verbose(`CommitRetrieverService: Last tag is: ${lastTag || "none"}`);

        const commitHashesResult = await this.gitProvider.history.commitsSince(lastTag);
        if (commitHashesResult.isErr()) {
            return err(commitHashesResult.error);
        }

        const commitHashes = commitHashesResult.value;
        logger.verbose(`CommitRetrieverService: Found ${commitHashes.length} commits since last tag.`);

        if (commitHashes.length === 0) {
            logger.verbose("No new commits found since last tag.");
            return ok([]);
        }

        const commits: Commit[] = [];
        const commitDetailsPromises = commitHashes.map((hash) =>
            this.gitProvider.history.commitDetails(hash).then((result) => ({ hash, result })),
        );

        const commitDetailsResults = await Promise.all(commitDetailsPromises);

        for (const { hash, result } of commitDetailsResults) {
            if (result.isErr()) {
                return err(result.error);
            }

            const parsedCommit = this.parseCommitDetails(result.value, hash);
            if (parsedCommit.isErr()) {
                return err(parsedCommit.error);
            }

            commits.push(parsedCommit.value);
        }

        logger.verbose(`CommitRetrieverService: Successfully parsed ${commits.length} commits`);
        return ok(commits);
    }

    private parseCommitDetails(rawDetails: string, hash: string): FireflyResult<Commit> {
        if (!rawDetails || typeof rawDetails !== "string") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Invalid commit details for ${hash}`,
                    source: "CommitRetrieverService.parseCommitDetails",
                }),
            );
        }

        const lines = rawDetails.trim().split("\n");
        const commitData: Record<string, string> = {};

        for (const line of lines) {
            const colonIndex = line.indexOf(":");
            if (colonIndex === -1) continue;

            const key = line.substring(0, colonIndex);
            const value = line.substring(colonIndex + 1);
            commitData[key] = value;
        }

        const subject = commitData.subject || "";
        const body = commitData.body || "";
        const notes = commitData.notes || "";

        const messageAnalysis = this.analyzeCommitMessage(subject);

        const commit: Commit = {
            hash,
            date: commitData.date || null,
            author: commitData.author || null,
            header: subject || null,
            body: body || null,
            footer: null,
            type: messageAnalysis.type,
            scope: messageAnalysis.scope,
            subject: messageAnalysis.subject,
            merge: null,
            revert: this.parseRevertInfo(subject),
            notes: this.parseBreakingChangeNotes(body, notes),
            mentions: this.extractMentions(body),
            references: this.extractReferences(body),
        };

        return ok(commit);
    }

    private analyzeCommitMessage(subject: string): {
        type: string | null;
        scope: string | null;
        subject: string | null;
    } {
        const breakingMatch = subject.match(CommitRetrieverService.BREAKING_PATTERN);
        if (breakingMatch) {
            return {
                type: breakingMatch[1] || null,
                scope: breakingMatch[2] || null,
                subject: breakingMatch[3] || null,
            };
        }

        const standardMatch = subject.match(CommitRetrieverService.COMMIT_MESSAGE_PATTERN);
        if (standardMatch) {
            return {
                type: standardMatch[1] || null,
                scope: standardMatch[2] || null,
                subject: standardMatch[3] || null,
            };
        }

        return {
            type: null,
            scope: null,
            subject: subject || null,
        };
    }

    private parseRevertInfo(subject: string): Record<string, string | null> | null {
        const revertMatch = subject.match(CommitRetrieverService.REVERT_PATTERN);
        if (revertMatch) {
            return {
                header: revertMatch[1] || null,
                hash: revertMatch[2] || null,
            };
        }
        return null;
    }

    private parseBreakingChangeNotes(body: string, notes: string): Array<{ title: string; text: string }> {
        const breakingNotes: Array<{ title: string; text: string }> = [];

        const breakingChangePattern = /BREAKING CHANGE:\s*(.+?)(?=\n\n|\n[A-Z]|$)/gs;
        const fullText = `${body}\n${notes}`;

        let match = breakingChangePattern.exec(fullText);
        while (match !== null) {
            const text = match[1];
            if (text) {
                breakingNotes.push({
                    title: "BREAKING CHANGE",
                    text: text.trim(),
                });
            }
            match = breakingChangePattern.exec(fullText);
        }

        return breakingNotes;
    }

    private extractMentions(text: string): string[] {
        const mentionPattern = /@([a-zA-Z0-9_-]+)/g;
        const mentions: string[] = [];

        let match = mentionPattern.exec(text);
        while (match !== null) {
            const mention = match[1];
            if (mention) {
                mentions.push(mention);
            }
            match = mentionPattern.exec(text);
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

        const referencePattern = /(fixes?|closes?|resolves?)\s+#(\d+)|#(\d+)/gi;

        let match = referencePattern.exec(text);
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
            match = referencePattern.exec(text);
        }

        return references;
    }
}
