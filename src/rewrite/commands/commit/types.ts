/**
 * Shared types for the commit command.
 */

export interface CommitData extends Record<string, unknown> {
    /**
     * Available commit types (from cliff.toml or default).
     */
    commitTypes?: Array<{
        type: string;
        description: string;
        emoji?: string;
    }>;

    /**
     * Selected commit type.
     */
    selectedType?: string;

    /**
     * Optional scope.
     */
    scope?: string;

    /**
     * Commit subject/message.
     */
    subject?: string;

    /**
     * Optional commit body.
     */
    body?: string;

    /**
     * Optional footer.
     */
    footer?: string;

    /**
     * Whether this is a breaking change.
     */
    breaking?: boolean;

    /**
     * Full formatted commit message.
     */
    commitMessage?: string;

    /**
     * Whether commit passed validation.
     */
    validated?: boolean;

    /**
     * Commit SHA after successful commit.
     */
    commitSha?: string;
}

/**
 * Parsed cliff.toml commit type.
 */
export interface CliffCommitType {
    type: string;
    group?: string;
    description?: string;
    emoji?: string;
}

/**
 * Conventional commit message parts.
 */
export interface ConventionalCommitMessage {
    type: string;
    scope?: string;
    breaking: boolean;
    subject: string;
    body?: string;
    footer?: string;
}
