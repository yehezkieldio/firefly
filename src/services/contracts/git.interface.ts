import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { DryRunOptions } from "#/infrastructure/dry-run";

/**
 * Represents the current status of a git working directory.
 */
export interface GitStatus extends DryRunOptions {
    /**
     * Whether there are changes staged for commit
     */
    readonly hasStaged: boolean;

    /**
     * Whether there are unstaged modifications to tracked files
     */
    readonly hasUnstaged: boolean;

    /**
     * Whether there are untracked files in the working directory
     */
    readonly hasUntracked: boolean;

    /**
     * Whether the working directory is clean (no changes)
     */
    readonly isClean: boolean;
}

/**
 * Result of checking for unpushed commits.
 */
export interface UnpushedCommitsResult {
    /**
     * Whether there are commits not yet pushed to the remote
     */
    readonly hasUnpushed: boolean;

    /**
     * Number of unpushed commits
     */
    readonly count: number;
}

/**
 * Represents a file with its git status code.
 */
export interface GitFileStatus {
    /**
     * The file path relative to the repository root
     */
    readonly path: string;

    /**
     * The git status code for the index (staged area)
     * M = modified, A = added, D = deleted, R = renamed, C = copied, ? = untracked
     */
    readonly indexStatus: string;

    /**
     * The git status code for the working tree
     * M = modified, A = added, D = deleted, R = renamed, C = copied, ? = untracked
     */
    readonly workTreeStatus: string;
}

/**
 * Options for git commit operations.
 */
export interface CommitOptions extends DryRunOptions {
    /**
     * Whether to GPG sign the commit
     */
    readonly sign?: boolean;

    /**
     * Allow creating a commit with no changes
     */
    readonly allowEmpty?: boolean;

    /**
     * Specific file paths to include in the commit
     */
    readonly paths?: string[];

    /**
     * Skip pre-commit and commit-msg hooks
     */
    readonly noVerify?: boolean;
}

/**
 * Result of a successful commit operation.
 */
export interface CommitResult {
    /**
     * Short SHA hash of the created commit
     */
    readonly sha: string;
}

/**
 * Options for git tag operations.
 */
export interface TagOptions extends DryRunOptions {
    /**
     * Annotation message for the tag (creates annotated tag)
     *
     */
    readonly message?: string;

    /**
     *  Whether to GPG sign the tag
     */
    readonly sign?: boolean;
}

/**
 * Options for git push operations.
 */
export interface PushOptions extends DryRunOptions {
    /**
     * Remote name to push to.
     * @default "origin"
     */
    readonly remote?: string;

    /**
     * Specific branch to push
     */
    readonly branch?: string;

    /**
     *  Push all tags
     */
    readonly tags?: boolean;

    /**
     *  Push commits and their associated tags
     */
    readonly followTags?: boolean;
}

/**
 * Service for git operations.
 */
export interface IGitService {
    /**
     * Checks if the current directory is inside a git repository.
     */
    isRepository(): FireflyAsyncResult<boolean>;

    /**
     * Gets the name of the current branch.
     */
    currentBranch(): FireflyAsyncResult<string>;

    /**
     * Gets the detailed status of the working directory.
     */
    status(): FireflyAsyncResult<GitStatus>;

    /**
     * Checks if the working directory is clean (no changes).
     */
    isClean(): FireflyAsyncResult<boolean>;

    /**
     * Checks for commits that haven't been pushed to the remote.
     */
    unpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult>;

    /**
     * Gets the absolute path to the repository root.
     */
    repositoryRoot(): FireflyAsyncResult<string>;

    /**
     * Gets the most recent tag in the repository.
     * @returns The tag name, or null if no tags exist.
     */
    getLastTag(): FireflyAsyncResult<string | null>;

    /**
     * Lists all tags in the repository.
     */
    listTags(): FireflyAsyncResult<string[]>;

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

    /**
     * Gets the URL of a remote.
     * @param remote - Remote name (defaults to "origin")
     */
    getRemoteUrl(remote?: string): FireflyAsyncResult<string>;

    /**
     * Checks if a branch exists in the repository.
     * @param branch - Branch name to check
     */
    branchExists(branch: string): FireflyAsyncResult<boolean>;

    /**
     * Creates a new commit with the given message.
     * @param message - Commit message
     * @param options - Commit options including signing and dry-run
     */
    commit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult>;

    /**
     * Creates a new tag.
     * @param name - Tag name (e.g., "v1.0.0")
     * @param options - Tag options including message and dry-run
     */
    tag(name: string, options?: TagOptions): FireflyAsyncResult<void>;

    /**
     * Pushes commits and/or tags to the remote.
     * @param options - Push options including remote, branch, and dry-run
     */
    push(options?: PushOptions): FireflyAsyncResult<void>;

    /**
     * Stages files for the next commit.
     * @param paths - File path(s) to stage
     */
    add(paths: string | string[]): FireflyAsyncResult<void>;

    /**
     * Deletes a local tag.
     * @param name - Tag name to delete
     * @param options - Dry-run options
     */
    deleteLocalTag(name: string, options?: DryRunOptions): FireflyAsyncResult<void>;

    /**
     * Deletes a remote tag by pushing a delete reference.
     * @param name - Tag name to delete
     * @param options - Push options including remote and dry-run
     */
    deleteRemoteTag(name: string, options?: PushOptions): FireflyAsyncResult<void>;

    /**
     * Checks if a tag exists in the repository.
     * @param name - Tag name to check
     */
    tagExists(name: string): FireflyAsyncResult<boolean>;

    /**
     * Gets the message of an annotated tag.
     * @param name - Tag name
     * @returns The tag message, or null if the tag is lightweight or doesn't exist.
     */
    getTagMessage(name: string): FireflyAsyncResult<string | null>;

    /**
     * Gets all staged files with their status information.
     * @returns Array of files that are staged for commit.
     */
    getStagedFiles(): FireflyAsyncResult<GitFileStatus[]>;

    /**
     * Gets the names of all staged files.
     * @returns Array of file paths that are staged for commit.
     */
    getStagedFileNames(): FireflyAsyncResult<string[]>;

    /**
     * Gets all unstaged modified files with their status information.
     * These are tracked files that have been modified but not staged.
     * @returns Array of files with unstaged modifications.
     */
    getUnstagedFiles(): FireflyAsyncResult<GitFileStatus[]>;

    /**
     * Gets the names of all unstaged modified files.
     * @returns Array of file paths with unstaged modifications.
     */
    getUnstagedFileNames(): FireflyAsyncResult<string[]>;

    /**
     * Gets all modified files (both staged and unstaged) with their status information.
     * @returns Array of all modified files.
     */
    getModifiedFiles(): FireflyAsyncResult<GitFileStatus[]>;

    /**
     * Gets the names of all modified files (both staged and unstaged).
     * @returns Array of all modified file paths.
     */
    getModifiedFileNames(): FireflyAsyncResult<string[]>;
}
