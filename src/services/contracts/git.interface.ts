import type { FireflyAsyncResult } from "#/core/result/result.types";

/**
 * Service for git operations.
 */
export interface IGitService {
    /**
     * Checks if the current directory is inside a git repository.
     */
    isRepository(): FireflyAsyncResult<boolean>;
}
