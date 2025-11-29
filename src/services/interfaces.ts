/**
 * Service Interfaces Module
 *
 * Defines the contracts for all services used in the workflow system.
 * Services provide abstracted access to external resources (file system, git, etc.)
 * enabling testability through dependency injection and mock implementations.
 *
 * @module services/interfaces
 */

import type { FireflyAsyncResult } from "#/utils/result";

// ============================================================================
// Git Types
// ============================================================================

/**
 * Represents the current status of a git working directory.
 */
export interface GitStatus {
    /** Whether there are changes staged for commit */
    readonly hasStaged: boolean;
    /** Whether there are unstaged modifications to tracked files */
    readonly hasUnstaged: boolean;
    /** Whether there are untracked files in the working directory */
    readonly hasUntracked: boolean;
    /** True if the working directory has no changes (staged, unstaged, or untracked) */
    readonly isClean: boolean;
}

/**
 * Result of checking for unpushed commits.
 */
export interface UnpushedCommitsResult {
    /** Whether there are commits not yet pushed to the remote */
    readonly hasUnpushed: boolean;
    /** Number of unpushed commits */
    readonly count: number;
}

// ============================================================================
// File System Options
// ============================================================================

/**
 * Options for file write operations.
 */
export interface WriteOptions {
    /**
     * When true, the operation is simulated without making actual changes.
     * Useful for testing and previewing operations.
     */
    readonly dryRun?: boolean;
}

/**
 * Options for JSON write operations.
 */
export interface WriteJsonOptions extends WriteOptions {
    /**
     * Number of spaces for JSON indentation.
     * @default 2
     */
    readonly indent?: number;
}

// ============================================================================
// Git Options
// ============================================================================

/**
 * Options for git commit operations.
 */
export interface CommitOptions {
    /** Whether to GPG sign the commit */
    readonly sign?: boolean;
    /** Allow creating a commit with no changes */
    readonly allowEmpty?: boolean;
    /** Specific file paths to include in the commit */
    readonly paths?: string[];
    /** Skip pre-commit and commit-msg hooks */
    readonly noVerify?: boolean;
    /** Simulate the operation without making changes */
    readonly dryRun?: boolean;
}

/**
 * Result of a successful commit operation.
 */
export interface CommitResult {
    /** Short SHA hash of the created commit */
    readonly sha: string;
}

/**
 * Options for git tag operations.
 */
export interface TagOptions {
    /** Annotation message for the tag (creates annotated tag) */
    readonly message?: string;
    /** Whether to GPG sign the tag */
    readonly sign?: boolean;
    /** Simulate the operation without making changes */
    readonly dryRun?: boolean;
}

/**
 * Options for git push operations.
 */
export interface PushOptions {
    /**
     * Remote name to push to.
     * @default "origin"
     */
    readonly remote?: string;
    /** Specific branch to push */
    readonly branch?: string;
    /** Push all tags */
    readonly tags?: boolean;
    /** Push commits and their associated tags */
    readonly followTags?: boolean;
    /** Simulate the operation without making changes */
    readonly dryRun?: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Service for file system operations.
 *
 * Provides an abstraction over file system access, enabling:
 * - Dry-run support for safe testing
 * - Path resolution relative to a base path
 * - Consistent error handling via Result types
 *
 * @example
 * ```typescript
 * const fs = createFileSystemService("/path/to/project");
 *
 * // Read a file
 * const contentResult = await fs.read("package.json");
 * if (contentResult.isOk()) {
 *   console.log(contentResult.value);
 * }
 *
 * // Write with dry-run
 * await fs.writeJson("config.json", data, { dryRun: true });
 * ```
 */
export interface IFileSystemService {
    /**
     * Checks if a file or directory exists.
     * @param path - Path relative to the service's base path, or absolute
     */
    exists(path: string): FireflyAsyncResult<boolean>;

    /**
     * Reads the contents of a text file.
     * @param path - Path relative to the service's base path, or absolute
     * @returns File contents as a string, or error if not found
     */
    read(path: string): FireflyAsyncResult<string>;

    /**
     * Reads and parses a JSON file.
     * @template T - Expected type of the parsed JSON
     * @param path - Path relative to the service's base path, or absolute
     * @returns Parsed JSON data, or error if not found or invalid JSON
     */
    readJson<T>(path: string): FireflyAsyncResult<T>;

    /**
     * Writes content to a text file.
     * @param path - Path relative to the service's base path, or absolute
     * @param content - String content to write
     * @param options - Write options including dry-run support
     */
    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void>;

    /**
     * Writes data as formatted JSON to a file.
     * @template T - Type of the data to serialize
     * @param path - Path relative to the service's base path, or absolute
     * @param data - Data to serialize as JSON
     * @param options - Write options including indentation and dry-run
     */
    writeJson<T>(path: string, data: T, options?: WriteJsonOptions): FireflyAsyncResult<void>;
}

/**
 * Service for git operations.
 *
 * Provides an abstraction over git commands, enabling:
 * - Dry-run support for safe testing
 * - Consistent error handling via Result types
 * - Repository state inspection
 *
 * @example
 * ```typescript
 * const git = createGitService("/path/to/repo");
 *
 * // Check repository status
 * const statusResult = await git.status();
 * if (statusResult.isOk() && statusResult.value.isClean) {
 *   // Safe to proceed with release
 *   await git.commit("chore: release v1.0.0");
 *   await git.tag("v1.0.0", { message: "Release v1.0.0" });
 *   await git.push({ followTags: true });
 * }
 * ```
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
     * Lists all tags in the repository.
     */
    listTags(): FireflyAsyncResult<string[]>;

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
     * Gets the URL of a remote.
     * @param remote - Remote name (defaults to "origin")
     */
    getRemoteUrl(remote?: string): FireflyAsyncResult<string>;

    /**
     * Checks if a branch exists in the repository.
     * @param branch - Branch name to check
     */
    branchExists(branch: string): FireflyAsyncResult<boolean>;
}
