import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { executeGitCommand } from "#/infrastructure/executors/git-command.executor";
import { logger } from "#/infrastructure/logging";
import type {
    BranchInformation,
    CommitOptions,
    CommitResult,
    CreateTagOptions,
    DeleteTagOptions,
    FileStatusFilter,
    GitFileStatus,
    GitStatus,
    IGitService,
    PushOptions,
    UnpushedCommitsResult,
} from "#/services/contracts/git.interface";

const CURRENT_BRANCH_MARKER_REGEX = /^\*\s*/;
const REMOTES_PREFIX_REGEX = /^remotes\//;

/**
 * Default implementation of the git service.
 */
export class DefaultGitService implements IGitService {
    /**
     * The working directory where git commands are executed.
     */
    private readonly cwd: string;

    /**
     * Creates a new git service.
     * @param cwd - The working directory for git operations
     */
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
    private git(args: string[], options?: { dryRun?: boolean; verbose?: boolean }): FireflyAsyncResult<string> {
        return executeGitCommand(args, {
            cwd: this.cwd,
            dryRun: options?.dryRun,
            verbose: options?.verbose ?? false,
        });
    }

    isInsideRepository(): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--is-inside-work-tree"])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }

    getRepositoryRoot(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--show-toplevel"]).map((output) => output.trim());
    }

    getRemoteUrl(remote?: string): FireflyAsyncResult<string> {
        const remoteName = remote ?? "origin";
        return this.git(["remote", "get-url", remoteName]).map((output) => output.trim());
    }

    getStatus(): FireflyAsyncResult<GitStatus> {
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

    isWorkingTreeClean(): FireflyAsyncResult<boolean> {
        return this.getStatus().map((status) => status.isClean);
    }

    /**
     * Parses git status porcelain output into structured file status objects.
     *
     * @param output - The raw output from `git status --porcelain`
     * @returns Array of GitFileStatus objects
     */
    private parseStatusOutput(output: string): GitFileStatus[] {
        return output
            .split("\n")
            .filter((line) => line.length >= 3)
            .map((line) => {
                const indexStatus = line[0] ?? " ";
                const workTreeStatus = line[1] ?? " ";
                const path = line.slice(3).trim();
                return { path, indexStatus, workTreeStatus };
            });
    }

    getFiles(filter?: FileStatusFilter): FireflyAsyncResult<GitFileStatus[]> {
        const includeStaged = filter?.staged ?? true;
        const includeUnstaged = filter?.unstaged ?? true;

        return this.git(["status", "--porcelain"]).map((output) => {
            const files = this.parseStatusOutput(output);

            return files.filter((file) => {
                const isStaged = file.indexStatus !== " " && file.indexStatus !== "?";
                const isUnstaged = file.workTreeStatus !== " " && file.workTreeStatus !== "?";

                if (includeStaged && includeUnstaged) {
                    return isStaged || isUnstaged;
                }
                if (includeStaged) {
                    return isStaged;
                }
                if (includeUnstaged) {
                    return isUnstaged;
                }
                return false;
            });
        });
    }

    getFileNames(filter?: FileStatusFilter): FireflyAsyncResult<string[]> {
        return this.getFiles(filter).map((files) => files.map((file) => file.path));
    }

    getCurrentBranch(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--abbrev-ref", "HEAD"]).map((output) => output.trim());
    }

    hasBranch(branch: string): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--verify", branch])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }

    private parseBranchLine(line: string): BranchInformation {
        const isCurrent = line.startsWith("*");
        const isRemote = line.includes("remotes/");

        // Remove the "*" marker and any leading whitespace
        let branchName = line.replace(CURRENT_BRANCH_MARKER_REGEX, "").trim();

        // Remove "remotes/" prefix for remote branches
        if (isRemote) {
            branchName = branchName.replace(REMOTES_PREFIX_REGEX, "");
        }

        return {
            name: branchName,
            isCurrent,
            isRemote,
        };
    }

    listBranches(includeRemote?: boolean): FireflyAsyncResult<BranchInformation[]> {
        const args = ["branch"];
        if (includeRemote) {
            args.push("-a");
        }

        return this.git(args).map((output) => {
            const lines = output.split("\n").filter((line) => line.trim().length > 0);
            return lines.map((line) => this.parseBranchLine(line));
        });
    }

    createCommit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult> {
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

    getUnpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult> {
        return this.getCurrentBranch().andThen((branch) => {
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

    createTag(name: string, options?: CreateTagOptions): FireflyAsyncResult<void> {
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

        return this.git(args).map(() => undefined);
    }

    deleteTag(name: string, options?: DeleteTagOptions): FireflyAsyncResult<void> {
        const scope = options?.scope ?? "local";
        const remote = options?.remote ?? "origin";

        if (options?.dryRun) {
            logger.verbose(`GitService: Dry run, skipping tag deletion (${scope}): ${name}`);
            return FireflyOkAsync(undefined);
        }

        if (scope === "local") {
            return this.git(["tag", "-d", name]).map(() => undefined);
        }

        if (scope === "remote") {
            return this.git(["push", remote, `:refs/tags/${name}`]).map(() => undefined);
        }

        // scope === "both"
        return this.git(["tag", "-d", name])
            .andThen(() => this.git(["push", remote, `:refs/tags/${name}`]))
            .map(() => undefined);
    }

    hasTag(name: string): FireflyAsyncResult<boolean> {
        return this.git(["tag", "--list", name]).map((output) => output.trim() === name);
    }

    hasAnyTags(): FireflyAsyncResult<boolean> {
        return this.getLatestTag().map((tag) => tag !== null);
    }

    listTags(): FireflyAsyncResult<string[]> {
        return this.git(["tag", "--list"]).map((output) =>
            output
                .split("\n")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
        );
    }

    getLatestTag(): FireflyAsyncResult<string | null> {
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

    getTagMessage(name: string): FireflyAsyncResult<string | null> {
        return this.git(["tag", "-l", "--format=%(contents)", name])
            .map((output) => {
                const message = output.trim();
                return message || null;
            })
            .orElse(() => FireflyOkAsync(null));
    }

    stage(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        return this.git(["add", ...pathArray]).map(() => undefined);
    }

    unstage(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        return this.git(["reset", "HEAD", "--", ...pathArray]).map(() => undefined);
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

        return this.git(args).map(() => undefined);
    }
}

/**
 * Creates a git service instance.
 */
export function createGitService(cwd: string): IGitService {
    return new DefaultGitService(cwd);
}
