import type { FireflyAsyncResult } from "#/core/result/result.types";

/**
 * Service for git operations.
 */
export interface IGitService {
    /**
     * Checks if the current directory is inside a git repository.
     */
    isRepository(): FireflyAsyncResult<boolean>;

    /**
     * Gets the most recent tag in the repository.
     * @returns The tag name, or null if no tags exist.
     */
    getLastTag(): FireflyAsyncResult<string | null>;

    /**
     * Gets all commit hashes since a given reference.
     * @param since - The reference to start from (tag, commit hash), or null for all commits.
     * @returns Array of commit hashes.
     */
    getCommitHashesSince(since: string | null): FireflyAsyncResult<string[]>;

    /**
     * Gets detailed information about a specific commit.
     * @param hash - The commit hash.
     * @returns Raw commit details string in a predefined format.
     */
    getCommitDetails(hash: string): FireflyAsyncResult<string>;

    /**
     * Checks if the repository has any tags.
     */
    hasAnyTags(): FireflyAsyncResult<boolean>;
}
