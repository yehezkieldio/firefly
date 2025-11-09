/**
 * Shared types for the autocommit command.
 */

export interface AutocommitData extends Record<string, unknown> {
    /**
     * Staged files with their diffs.
     */
    stagedFiles?: Array<{
        path: string;
        status: string;
        diff: string;
    }>;

    /**
     * Generated commit message.
     */
    generatedMessage?: {
        type: string;
        scope?: string;
        subject: string;
        body?: string;
        footer?: string;
        breaking?: boolean;
    };

    /**
     * Raw commit message text.
     */
    commitMessage?: string;

    /**
     * Whether user approved the message.
     */
    approved?: boolean;

    /**
     * Edited message (if user edited it).
     */
    editedMessage?: string;

    /**
     * Commit SHA after successful commit.
     */
    commitSha?: string;
}

/**
 * AI provider interface.
 */
export interface AIProvider {
    name: string;
    generateCommitMessage(diff: string, context: AIContext): Promise<string>;
}

/**
 * Context provided to AI for commit generation.
 */
export interface AIContext {
    stagedFiles: string[];
    recentCommits?: string[];
    systemPrompt?: string;
    commitTypes: string[];
}

/**
 * Parsed conventional commit structure.
 */
export interface ConventionalCommit {
    type: string;
    scope?: string;
    subject: string;
    body?: string;
    footer?: string;
    breaking?: boolean;
}
