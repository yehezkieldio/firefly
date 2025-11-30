import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { DryRunOptions } from "#/infrastructure/dry-run";

/**
 * Represents the current status of a git working directory.
 */
export interface GitStatus {
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
 * Scope for tag operations.
 */
export type TagScope = "local" | "remote" | "both";

/**
 * Operations that can be performed on tags.
 */
export type TagOperation = "create" | "delete" | "check" | "list" | "getMessage";

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
 * Information about a git branch.
 */
export interface BranchInformation {
    /***
     * Name of the branch
     */
    name: string;

    /**
     * Whether this is the current checked-out branch
     */
    isCurrent: boolean;

    /**
     * Whether this is a remote-tracking branch
     *
     */
    isRemote: boolean;

    /**
     * Upstream branch name, if set
     */
    upstream?: string;
}

/**
 * Options for creating git tags.
 */
export interface CreateTagOptions extends DryRunOptions {
    /**
     * Annotation message for the tag (creates annotated tag)
     */
    readonly message?: string;

    /**
     * Whether to GPG sign the tag
     */
    readonly sign?: boolean;
}

/**
 * Options for deleting git tags.
 */
export interface DeleteTagOptions extends DryRunOptions {
    /**
     * Scope of the delete operation.
     * - "local": Delete only from local repository
     * - "remote": Delete only from remote repository
     * - "both": Delete from both local and remote
     * @default "local"
     */
    readonly scope?: TagScope;

    /**
     * Remote name for remote operations.
     * @default "origin"
     */
    readonly remote?: string;
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
 * Filter options for retrieving file status.
 */
export interface FileStatusFilter {
    /**
     * Include staged files.
     * @default true
     */
    readonly staged?: boolean;

    /**
     * Include unstaged files.
     * @default true
     */
    readonly unstaged?: boolean;

    /**
     * Return only file names instead of full status objects.
     * @default false
     */
    readonly namesOnly?: boolean;
}

/**
 * Service for git operations.
 */
export interface IGitService {
    /**
     * Checks if the current directory is inside a git repository.
     */
    isInsideRepository(): FireflyAsyncResult<boolean>;

    /**
     * Gets the absolute path to the repository root.
     */
    getRepositoryRoot(): FireflyAsyncResult<string>;

    /**
     * Gets the URL of a remote.
     * @param remote - Remote name (defaults to "origin")
     */
    getRemoteUrl(remote?: string): FireflyAsyncResult<string>;

    /**
     * Gets the detailed status of the working directory.
     */
    getStatus(): FireflyAsyncResult<GitStatus>;

    /**
     * Checks if the working directory is clean (no changes).
     */
    isWorkingTreeClean(): FireflyAsyncResult<boolean>;

    /**
     * Gets files based on filter criteria.
     * @param filter - Options to filter which files to return
     * @returns Array of files matching the filter criteria.
     */
    getFiles(filter?: FileStatusFilter): FireflyAsyncResult<GitFileStatus[]>;

    /**
     * Gets file names based on filter criteria.
     * @param filter - Options to filter which files to return
     * @returns Array of file paths matching the filter criteria.
     */
    getFileNames(filter?: FileStatusFilter): FireflyAsyncResult<string[]>;

    /**
     * Gets the name of the current branch.
     */
    getCurrentBranch(): FireflyAsyncResult<string>;

    /**
     * Checks if a branch exists in the repository.
     * @param branch - Branch name to check
     */
    hasBranch(branch: string): FireflyAsyncResult<boolean>;

    /**
     * Gets a list of branches in the repository.
     * @param includeRemote - Whether to include remote branches
     */
    listBranches(includeRemote?: boolean): FireflyAsyncResult<BranchInformation[]>;

    /**
     * Creates a new commit with the given message.
     * @param message - Commit message
     * @param options - Commit options including signing and dry-run
     */
    createCommit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult>;

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
     * Checks for commits that haven't been pushed to the remote.
     */
    getUnpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult>;

    /**
     * Creates a new tag.
     * @param name - Tag name (e.g., "v1.0.0")
     * @param options - Tag options including message and signing
     */
    createTag(name: string, options?: CreateTagOptions): FireflyAsyncResult<void>;

    /**
     * Deletes a tag from local and/or remote repository.
     * @param name - Tag name to delete
     * @param options - Delete options including scope and remote
     */
    deleteTag(name: string, options?: DeleteTagOptions): FireflyAsyncResult<void>;

    /**
     * Checks if a tag exists in the repository.
     * @param name - Tag name to check
     */
    hasTag(name: string): FireflyAsyncResult<boolean>;

    /**
     * Checks if the repository has any tags.
     */
    hasAnyTags(): FireflyAsyncResult<boolean>;

    /**
     * Lists all tags in the repository.
     */
    listTags(): FireflyAsyncResult<string[]>;

    /**
     * Gets the most recent tag in the repository.
     * @returns The tag name, or null if no tags exist.
     */
    getLatestTag(): FireflyAsyncResult<string | null>;

    /**
     * Gets the message of an annotated tag.
     * @param name - Tag name
     * @returns The tag message, or null if the tag is lightweight or doesn't exist.
     */
    getTagMessage(name: string): FireflyAsyncResult<string | null>;

    /**
     * Stages files for the next commit.
     * @param paths - File path(s) to stage
     */
    stage(paths: string | string[]): FireflyAsyncResult<void>;

    /**
     * Unstages files from the staging area.
     * @param paths - File path(s) to unstage
     */
    unstage(paths: string | string[]): FireflyAsyncResult<void>;

    /**
     * Pushes commits and/or tags to the remote.
     * @param options - Push options including remote, branch, and dry-run
     */
    push(options?: PushOptions): FireflyAsyncResult<void>;
}
