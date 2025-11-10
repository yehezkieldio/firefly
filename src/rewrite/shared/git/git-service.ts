import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ResultAsync, ok, err } from "neverthrow";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

const execAsync = promisify(exec);

/**
 * Git file status information.
 */
export interface GitFileStatus {
    path: string;
    status: string; // e.g., "M" (modified), "A" (added), "D" (deleted)
    staged: boolean;
}

/**
 * Git commit information.
 */
export interface GitCommit {
    sha: string;
    message: string;
    author: string;
    date: Date;
    type?: string; // Conventional commit type (feat, fix, etc.)
    scope?: string;
    breaking?: boolean;
}

/**
 * Options for git diff.
 */
export interface GitDiffOptions {
    staged?: boolean;
    cached?: boolean;
    files?: string[];
    maxLength?: number;
}

/**
 * Git service for all git operations.
 * Used by all commands (release, autocommit, commit).
 */
export class GitService {
    private readonly cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Execute a git command.
     */
    private execGit(command: string): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(
            execAsync(`git ${command}`, { cwd: this.cwd }).then((result) => result.stdout.trim()),
            (error: any) => createFireflyError({ message: `Git command failed: ${error.message}`, cause: error }),
        );
    }

    /**
     * Check if current directory is a git repository.
     */
    isRepository(): FireflyAsyncResult<boolean> {
        return this.execGit("rev-parse --is-inside-work-tree")
            .map(() => true)
            .orElse(() => ResultAsync.fromSafePromise(Promise.resolve(false)));
    }

    /**
     * Check if there are uncommitted changes.
     */
    hasUncommittedChanges(): FireflyAsyncResult<boolean> {
        return this.execGit("status --porcelain").map((output) => output.length > 0);
    }

    /**
     * Get repository status.
     */
    getStatus(): FireflyAsyncResult<GitFileStatus[]> {
        return this.execGit("status --porcelain").map((output) => {
            if (!output) return [];

            return output.split("\n").map((line) => {
                const status = line.substring(0, 2).trim();
                const path = line.substring(3);
                const staged = line[0] !== " " && line[0] !== "?";

                return { path, status, staged };
            });
        });
    }

    /**
     * Get staged files.
     */
    getStagedFiles(): FireflyAsyncResult<GitFileStatus[]> {
        return this.getStatus().map((files) => files.filter((f) => f.staged));
    }

    /**
     * Get unstaged files.
     */
    getUnstagedFiles(): FireflyAsyncResult<GitFileStatus[]> {
        return this.getStatus().map((files) => files.filter((f) => !f.staged));
    }

    /**
     * Stage files.
     */
    stageFiles(files: string[]): FireflyAsyncResult<void> {
        if (files.length === 0) {
            return ResultAsync.fromSafePromise(Promise.resolve());
        }

        const fileArgs = files.join(" ");
        return this.execGit(`add ${fileArgs}`).map(() => undefined);
    }

    /**
     * Stage all files.
     */
    stageAll(): FireflyAsyncResult<void> {
        return this.execGit("add -A").map(() => undefined);
    }

    /**
     * Get diff.
     */
    getDiff(options: GitDiffOptions = {}): FireflyAsyncResult<string> {
        let command = "diff";

        if (options.staged || options.cached) {
            command += " --cached";
        }

        if (options.files && options.files.length > 0) {
            command += ` -- ${options.files.join(" ")}`;
        }

        return this.execGit(command).map((diff) => {
            if (options.maxLength && diff.length > options.maxLength) {
                return diff.substring(0, options.maxLength) + "\n\n... (truncated)";
            }
            return diff;
        });
    }

    /**
     * Commit changes.
     */
    commit(message: string, options?: { amend?: boolean }): FireflyAsyncResult<string> {
        const amendFlag = options?.amend ? " --amend" : "";
        return this.execGit(`commit${amendFlag} -m "${message.replace(/"/g, '\\"')}"`).andThen(() =>
            this.execGit("rev-parse HEAD"),
        );
    }

    /**
     * Create a git tag.
     */
    createTag(name: string, message?: string, options?: { annotated?: boolean }): FireflyAsyncResult<void> {
        let command = `tag`;

        if (message && options?.annotated !== false) {
            command += ` -a ${name} -m "${message.replace(/"/g, '\\"')}"`;
        } else {
            command += ` ${name}`;
        }

        return this.execGit(command).map(() => undefined);
    }

    /**
     * Delete a tag.
     */
    deleteTag(name: string): FireflyAsyncResult<void> {
        return this.execGit(`tag -d ${name}`).map(() => undefined);
    }

    /**
     * Push to remote.
     */
    push(remote: string = "origin", branch?: string, options?: { tags?: boolean; force?: boolean }): FireflyAsyncResult<void> {
        let command = `push ${remote}`;

        if (branch) {
            command += ` ${branch}`;
        }

        if (options?.tags) {
            command += " --tags";
        }

        if (options?.force) {
            command += " --force";
        }

        return this.execGit(command).map(() => undefined);
    }

    /**
     * Get current branch name.
     */
    getCurrentBranch(): FireflyAsyncResult<string> {
        return this.execGit("rev-parse --abbrev-ref HEAD");
    }

    /**
     * Get remote URL.
     */
    getRemoteUrl(remote: string = "origin"): FireflyAsyncResult<string> {
        return this.execGit(`remote get-url ${remote}`);
    }

    /**
     * Get recent commits.
     */
    getRecentCommits(count: number = 10): FireflyAsyncResult<GitCommit[]> {
        const format = "%H|%s|%an|%ad";
        return this.execGit(`log -${count} --format="${format}" --date=iso`).map((output) => {
            if (!output) return [];

            return output.split("\n").map((line) => {
                const [sha, message, author, dateStr] = line.split("|");
                return {
                    sha,
                    message,
                    author,
                    date: new Date(dateStr),
                };
            });
        });
    }

    /**
     * Get commits since a tag or commit.
     */
    getCommitsSince(ref: string): FireflyAsyncResult<GitCommit[]> {
        const format = "%H|%s|%an|%ad";
        return this.execGit(`log ${ref}..HEAD --format="${format}" --date=iso`).map((output) => {
            if (!output) return [];

            return output.split("\n").map((line) => {
                const [sha, message, author, dateStr] = line.split("|");
                return {
                    sha,
                    message,
                    author,
                    date: new Date(dateStr),
                };
            });
        });
    }

    /**
     * Get latest tag.
     */
    getLatestTag(): FireflyAsyncResult<string | null> {
        return this.execGit("describe --tags --abbrev=0")
            .map((tag) => tag || null)
            .orElse(() => ResultAsync.fromSafePromise(Promise.resolve(null)));
    }

    /**
     * Check if a tag exists.
     */
    tagExists(name: string): FireflyAsyncResult<boolean> {
        return this.execGit(`tag -l ${name}`)
            .map((output) => output.trim() === name)
            .orElse(() => ResultAsync.fromSafePromise(Promise.resolve(false)));
    }

    /**
     * Reset repository to a specific state.
     */
    reset(mode: "soft" | "mixed" | "hard" = "mixed", ref: string = "HEAD"): FireflyAsyncResult<void> {
        return this.execGit(`reset --${mode} ${ref}`).map(() => undefined);
    }

    /**
     * Get git config value.
     */
    getConfig(key: string): FireflyAsyncResult<string | null> {
        return this.execGit(`config --get ${key}`)
            .map((value) => value || null)
            .orElse(() => ResultAsync.fromSafePromise(Promise.resolve(null)));
    }

    /**
     * Check if remote exists.
     */
    remoteExists(remote: string = "origin"): FireflyAsyncResult<boolean> {
        return this.execGit("remote").map((output) => {
            const remotes = output.split("\n");
            return remotes.includes(remote);
        });
    }
}
