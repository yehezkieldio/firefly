import type { Repository } from "#/core/domain/repository.js";
import type { ArtemisResult } from "#/shared/result.js";

export interface IGitProvider {
    /**
     * Get the current repository information
     */
    getCurrentRepository(): Promise<ArtemisResult<Repository>>;

    /**
     * Check if the working directory is clean (no uncommitted changes)
     */
    isWorkingDirectoryClean(): Promise<ArtemisResult<boolean>>;

    /**
     * Get the current branch name
     */
    getCurrentBranch(): Promise<ArtemisResult<string>>;

    /**
     * Stage all changes
     */
    stageAll(): Promise<ArtemisResult<void>>;

    /**
     * Stage specific files
     */
    stageFiles(files: string[]): Promise<ArtemisResult<void>>;

    /**
     * Commit changes with a message
     */
    commit(message: string): Promise<ArtemisResult<void>>;

    /**
     * Create a git tag
     */
    createTag(tag: string, message?: string): Promise<ArtemisResult<void>>;

    /**
     * Push changes to remote
     */
    push(remote?: string, branch?: string): Promise<ArtemisResult<void>>;

    /**
     * Push tags to remote
     */
    pushTags(remote?: string): Promise<ArtemisResult<void>>;

    /**
     * Get the latest tag
     */
    getLatestTag(): Promise<ArtemisResult<string>>;

    /**
     * Get tags that match a pattern
     */
    getTags(pattern?: string): Promise<ArtemisResult<string[]>>;

    /**
     * Get commit history between two references
     */
    getCommitHistory(
        from: string,
        to?: string
    ): Promise<ArtemisResult<string[]>>;

    /**
     * Check if a tag exists
     */
    hasTag(tag: string): Promise<ArtemisResult<boolean>>;

    /**
     * Get the remote URL for a given remote name
     */
    getRemoteUrl(remote?: string): Promise<ArtemisResult<string>>;
}
