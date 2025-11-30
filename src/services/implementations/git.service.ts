import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { executeGitCommand } from "#/infrastructure/executors/git-command.executor";
import { logger } from "#/infrastructure/logging";
import type {
    CommitOptions,
    CommitResult,
    GitStatus,
    IGitService,
    PushOptions,
    TagOptions,
    UnpushedCommitsResult,
} from "#/services/contracts/git.interface";

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

    /**
     * Executes a git command with the configured working directory
     *
     * @param args - Git command arguments
     * @param options - Execution options
     * @returns Command output or error
     */
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
            .orElse(() => FireflyOkAsync(false));
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
                        .orElse(() => FireflyOkAsync({ hasUnpushed: false, count: 0 }));
                });
        });
    }

    repositoryRoot(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--show-toplevel"]).map((output) => output.trim());
    }

    getLastTag(): FireflyAsyncResult<string | null> {
        return this.git(["describe", "--tags", "--abbrev=0"])
            .map((output) => {
                const tag = output.trim();
                return tag || null;
            })
            .orElse((error) => {
                // If no tags found, return null instead of error
                if (error.message.includes("No names found") || error.message.includes("fatal")) {
                    return FireflyOkAsync(null);
                }
                return FireflyOkAsync(null);
            });
    }

    listTags(): FireflyAsyncResult<string[]> {
        return this.git(["tag", "--list"]).map((output) =>
            output
                .split("\n")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
        );
    }

    getCommitHashesSince(since: string | null): FireflyAsyncResult<string[]> {
        const args = since ? ["rev-list", `${since}..HEAD`] : ["rev-list", "HEAD"];

        return this.git(args).map((output) =>
            output
                .trim()
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
        );
    }

    getCommitDetails(hash: string): FireflyAsyncResult<string> {
        const format = ["hash:%H", "date:%ci", "author:%an <%ae>", "subject:%s", "body:%b", "notes:%N"].join("%n");

        return this.git(["show", "--no-patch", `--format=${format}`, hash]);
    }

    hasAnyTags(): FireflyAsyncResult<boolean> {
        return this.getLastTag().map((tag) => tag !== null);
    }

    getRemoteUrl(remote?: string): FireflyAsyncResult<string> {
        const remoteName = remote ?? "origin";
        return this.git(["remote", "get-url", remoteName]).map((output) => output.trim());
    }

    branchExists(branch: string): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--verify", branch])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }

    commit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult> {
        if (options?.dryRun) {
            logger.verbose("GitService: Dry run, skipping commit");
            return FireflyOkAsync({ sha: "dry-run-sha" });
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
            return FireflyOkAsync(undefined);
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

        return this.git(args).andThen(() => FireflyOkAsync(undefined));
    }

    push(options?: PushOptions): FireflyAsyncResult<void> {
        if (options?.dryRun) {
            logger.verbose("GitService: Dry run, skipping push");
            return FireflyOkAsync(undefined);
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

        return this.git(args).andThen(() => FireflyOkAsync(undefined));
    }

    add(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        return this.git(["add", ...pathArray]).andThen(() => FireflyOkAsync(undefined));
    }
}

/**
 * Creates a git service instance.
 * @param cwd - Working directory for git commands
 */
export function createGitService(cwd: string): IGitService {
    return new DefaultGitService(cwd);
}
