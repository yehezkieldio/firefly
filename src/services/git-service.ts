/**
 * Git Service Implementation
 *
 * Provides git operations with:
 * - Dry-run support for safe testing
 * - Working directory configuration
 * - Async Result-based error handling
 *
 * @module services/git-service
 */

import { okAsync } from "neverthrow";
import type {
    CommitOptions,
    CommitResult,
    GitStatus,
    IGitService,
    PushOptions,
    TagOptions,
    UnpushedCommitsResult,
} from "#/services/interfaces";
import { executeGitCommand } from "#/utils/git-command-executor";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

/** Options for internal git command execution */
interface GitExecutionOptions {
    readonly dryRun?: boolean;
    readonly verbose?: boolean;
}

/**
 * Default implementation of the git service.
 *
 * Executes git commands via the system's git binary
 * using the configured working directory.
 */
export class DefaultGitService implements IGitService {
    private readonly cwd: string;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    /** Executes a git command with the configured working directory */
    private git(args: string[], options?: GitExecutionOptions): FireflyAsyncResult<string> {
        return executeGitCommand(args, {
            cwd: this.cwd,
            dryRun: options?.dryRun,
            verbose: options?.verbose ?? false,
        });
    }

    isRepository(): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--is-inside-work-tree"])
            .map(() => true)
            .orElse(() => okAsync(false));
    }

    currentBranch(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--abbrev-ref", "HEAD"]).map((output) => output.trim());
    }

    status(): FireflyAsyncResult<GitStatus> {
        return this.git(["status", "--porcelain"]).map((output) => {
            const lines = output.split("\n").filter((line) => line.length > 0);

            let hasStaged = false;
            let hasUnstaged = false;
            let hasUntracked = false;

            for (const line of lines) {
                const index = line[0];
                const workTree = line[1];

                if (index === "?") {
                    hasUntracked = true;
                } else if (index !== " " && index !== "?") {
                    hasStaged = true;
                }

                if (workTree !== " " && workTree !== "?") {
                    hasUnstaged = true;
                }
            }

            return {
                hasStaged,
                hasUnstaged,
                hasUntracked,
                isClean: lines.length === 0,
            };
        });
    }

    isClean(): FireflyAsyncResult<boolean> {
        return this.status().map((status) => status.isClean);
    }

    unpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult> {
        return this.currentBranch().andThen((branch) => {
            const upstream = `origin/${branch}`;

            return this.git(["rev-list", "--count", `${upstream}..HEAD`])
                .map((output) => {
                    const count = Number.parseInt(output.trim(), 10) || 0;
                    return { hasUnpushed: count > 0, count };
                })
                .orElse(() => {
                    // No upstream branch set - check if there are any commits at all
                    return this.git(["rev-list", "--count", "HEAD"])
                        .map((output) => {
                            const count = Number.parseInt(output.trim(), 10) || 0;
                            return { hasUnpushed: count > 0, count };
                        })
                        .orElse(() => okAsync({ hasUnpushed: false, count: 0 }));
                });
        });
    }

    repositoryRoot(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--show-toplevel"]).map((output) => output.trim());
    }

    listTags(): FireflyAsyncResult<string[]> {
        return this.git(["tag", "--list"]).map((output) =>
            output
                .split("\n")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
        );
    }

    commit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult> {
        if (options?.dryRun) {
            logger.verbose("GitService: Dry run, skipping commit");
            return okAsync({ sha: "dry-run-sha" });
        }

        const args = ["commit", "-m", message];

        if (options?.sign) {
            args.push("-S");
        }
        if (options?.allowEmpty) {
            args.push("--allow-empty");
        }
        if (options?.noVerify) {
            args.push("--no-verify");
        }
        if (options?.paths && options.paths.length > 0) {
            args.push("--", ...options.paths);
        }

        return this.git(args).andThen(() =>
            this.git(["rev-parse", "HEAD"]).map((sha) => ({
                sha: sha.trim().substring(0, 7),
            }))
        );
    }

    tag(name: string, options?: TagOptions): FireflyAsyncResult<void> {
        if (options?.dryRun) {
            logger.verbose(`GitService: Dry run, skipping tag creation: ${name}`);
            return okAsync(undefined);
        }

        const args = ["tag"];

        if (options?.message) {
            args.push("-a", name, "-m", options.message);
        } else {
            args.push(name);
        }

        if (options?.sign) {
            args.push("-s");
        }

        return this.git(args).andThen(() => okAsync(undefined));
    }

    push(options?: PushOptions): FireflyAsyncResult<void> {
        if (options?.dryRun) {
            logger.verbose("GitService: Dry run, skipping push");
            return okAsync(undefined);
        }

        const args = ["push"];
        const remote = options?.remote ?? "origin";

        args.push(remote);

        if (options?.branch) {
            args.push(options.branch);
        }

        if (options?.tags) {
            args.push("--tags");
        }

        if (options?.followTags) {
            args.push("--follow-tags");
        }

        return this.git(args).andThen(() => okAsync(undefined));
    }

    add(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        return this.git(["add", ...pathArray]).andThen(() => okAsync(undefined));
    }
}

/**
 * Creates a git service instance.
 * @param cwd - Working directory for git commands
 */
export function createGitService(cwd: string): IGitService {
    return new DefaultGitService(cwd);
}
