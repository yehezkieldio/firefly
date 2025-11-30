import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { Commit } from "#/domain/commits/commit-types";

/**
 * Service for commit history operations.
 * Provides high-level access to parsed conventional commits.
 */
export interface ICommitHistoryService {
    /**
     * Gets all commits since the last tag.
     * @returns Array of parsed commits.
     */
    getCommitsSinceLastTag(): FireflyAsyncResult<Commit[]>;

    /**
     * Gets all commits in the repository.
     * @returns Array of parsed commits.
     */
    getAllCommits(): FireflyAsyncResult<Commit[]>;

    /**
     * Gets all commits since a specific reference.
     * @param since - The reference to start from (tag, commit hash), or null for all commits.
     * @returns Array of parsed commits.
     */
    getCommitsSince(since: string | null): FireflyAsyncResult<Commit[]>;

    /**
     * Streams commits since a specific reference.
     * Useful for processing large commit histories without loading all into memory.
     * @param since - The reference to start from (tag, commit hash), or null for all commits.
     */
    streamCommits(since: string | null): AsyncGenerator<Commit, void, undefined>;

    /**
     * Streams commits since the last tag.
     */
    streamCommitsSinceLastTag(): AsyncGenerator<Commit, void, undefined>;
}
