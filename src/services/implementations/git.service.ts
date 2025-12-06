import { DebugFlags } from "#/core/environment/debug-flags";
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
            verbose: options?.verbose ?? true,
        });
    }

    isInsideRepository(): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--is-inside-work-tree"])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }

    getRepositoryRoot(): FireflyAsyncResult<string> {
        return this.git(["rev-parse", "--show-toplevel"]) // resolve root
            .andTee(() => logger.verbose("DefaultGitService: Resolving repository root"))
            .map((output) => output.trim())
            .andTee(() => logger.verbose("DefaultGitService: Repository root resolved"));
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

            const status = {
                hasStaged,
                hasUnstaged,
                hasUntracked,
                isClean: lines.length === 0,
            } satisfies GitStatus;

            logger.verbose(
                `DefaultGitService: Git status: staged=${status.hasStaged},unstaged=${status.hasUnstaged},untracked=${status.hasUntracked},clean=${status.isClean}`
            );

            return status;
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

            const filtered = files.filter((file) => {
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

            logger.verbose(
                `DefaultGitService: Found ${filtered.length} file(s) for filter staged=${includeStaged} unstaged=${includeUnstaged}`
            );

            return filtered;
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

        const branch = {
            name: branchName,
            isCurrent,
            isRemote,
        } as BranchInformation;

        logger.verbose(
            `DefaultGitService: Parsed branch: ${branch.name} current=${branch.isCurrent} remote=${branch.isRemote}`
        );

        return branch;
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
            logger.verbose("DefaultGitService: Dry run, skipping commit");
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

        return this.git(["show", "--no-patch", `--format=${format}`, hash], {
            verbose: DebugFlags.showVerboseGitCommitDetails,
        });
    }

    getUnpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult> {
        return this.getCurrentBranch().andThen((branch) => {
            const upstream = `origin/${branch}`;

            return this.git(["rev-list", "--count", `${upstream}..HEAD`])
                .map((output) => {
                    const count = Number.parseInt(output.trim(), 10) || 0;
                    logger.verbose(`DefaultGitService: Unpushed commits count for ${upstream}: ${count}`);
                    return { hasUnpushed: count > 0, count };
                })
                .orElse(() => {
                    // No upstream branch set - check if there are any commits at all
                    return this.git(["rev-list", "--count", "HEAD"])
                        .map((output) => {
                            const count = Number.parseInt(output.trim(), 10) || 0;
                            logger.verbose(`DefaultGitService: Total commit count: ${count}`);
                            return { hasUnpushed: count > 0, count };
                        })
                        .orElse(() => FireflyOkAsync({ hasUnpushed: false, count: 0 }));
                });
        });
    }

    createTag(name: string, options?: CreateTagOptions): FireflyAsyncResult<void> {
        if (options?.dryRun) {
            logger.verbose(`DefaultGitService: Dry run, skipping tag creation: ${name}`);
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
            logger.verbose(`DefaultGitService: Dry run, skipping tag deletion (${scope}): ${name}`);
            return FireflyOkAsync(undefined);
        }

        if (scope === "local") {
            return this.git(["tag", "-d", name]).map(() => undefined);
        }

        if (scope === "remote") {
            logger.verbose(`DefaultGitService: Deleting remote tag: ${name} on ${remote}`);
            return this.git(["push", remote, `:refs/tags/${name}`])
                .andTee(() => logger.verbose(`DefaultGitService: Remote tag deleted: ${name} on ${remote}`))
                .map(() => undefined);
        }

        // scope === "both"
        logger.verbose(`DefaultGitService: Deleting tag locally and remotely: ${name} on ${remote}`);
        return this.git(["tag", "-d", name])
            .andThen(() => this.git(["push", remote, `:refs/tags/${name}`]))
            .andTee(() => logger.verbose(`DefaultGitService: Local and remote tag deleted: ${name} on ${remote}`))
            .map(() => undefined);
    }

    hasTag(name: string): FireflyAsyncResult<boolean> {
        return this.git(["tag", "--list", name]).map((output) => {
            const exists = output.trim() === name;
            logger.verbose(`DefaultGitService: Tag ${name} exists=${exists}`);
            return exists;
        });
    }

    hasAnyTags(): FireflyAsyncResult<boolean> {
        return this.getLatestTag()
            .andTee(() => logger.verbose("DefaultGitService: Checking if any tags exist"))
            .map((tag) => tag !== null);
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
                logger.verbose(`DefaultGitService: Tag message for ${name}: ${message?.substring(0, 60) ?? "(none)"}`);
                return message || null;
            })
            .orElse(() => FireflyOkAsync(null));
    }

    stage(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        return this.git(["add", ...pathArray])
            .andTee(() => logger.verbose(`DefaultGitService: Staged paths: ${pathArray.join(", ")}`))
            .map(() => undefined);
    }

    unstage(paths: string | string[]): FireflyAsyncResult<void> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        logger.verbose(`DefaultGitService: Unstaging paths: ${pathArray.join(", ")}`);
        return this.git(["reset", "HEAD", "--", ...pathArray])
            .andTee(() => logger.verbose(`DefaultGitService: Unstaged paths: ${pathArray.join(", ")}`))
            .map(() => undefined);
    }

    push(options?: PushOptions): FireflyAsyncResult<void> {
        if (options?.dryRun) {
            logger.verbose("DefaultGitService: Dry run, skipping push");
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

    /**
     * Gets the upstream remote name for the current branch.
     * @returns The remote name or null if no upstream is configured.
     */
    private getUpstreamRemote(): FireflyAsyncResult<string | null> {
        return this.git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
            .map((output) => {
                // Output format is "remote/branch", extract the remote name
                const upstream = output.trim();
                const slashIndex = upstream.indexOf("/");
                if (slashIndex > 0) {
                    return upstream.substring(0, slashIndex);
                }
                return null;
            })
            .orElse(() => FireflyOkAsync(null));
    }

    /**
     * Lists all configured remotes.
     * @returns Array of remote names.
     */
    private listRemotes(): FireflyAsyncResult<string[]> {
        return this.git(["remote"]).map((output) =>
            output
                .split("\n")
                .map((remote) => remote.trim())
                .filter((remote) => remote.length > 0)
        );
    }

    inferRepositoryUrl(): FireflyAsyncResult<string | null> {
        // Strategy 1: Try upstream remote for current branch
        return this.getUpstreamRemote().andThen((upstreamRemote) => {
            if (upstreamRemote) {
                logger.verbose(`DefaultGitService: Inferring repository URL from upstream remote: ${upstreamRemote}`);
                return this.getRemoteUrl(upstreamRemote)
                    .map((url) => url as string | null)
                    .orElse(() => this.tryOriginOrFirstRemote());
            }
            logger.verbose("DefaultGitService: No upstream remote; falling back to origin or first remote");
            return this.tryOriginOrFirstRemote();
        });
    }

    /**
     * Tries to get the repository URL from 'origin' or the first available remote.
     */
    private tryOriginOrFirstRemote(): FireflyAsyncResult<string | null> {
        // Strategy 2: Try 'origin' remote
        return this.getRemoteUrl("origin")
            .map((url) => {
                logger.verbose("DefaultGitService: Inferring repository URL from origin remote");
                return url as string | null;
            })
            .orElse(() => {
                // Strategy 3: Try first available remote
                return this.listRemotes().andThen((remotes) => {
                    if (remotes.length === 0) {
                        logger.verbose("DefaultGitService: No remotes configured, cannot infer repository URL");
                        return FireflyOkAsync(null);
                    }
                    const firstRemote = remotes[0];
                    logger.verbose(`DefaultGitService: Inferring repository URL from first remote: ${firstRemote}`);
                    return this.getRemoteUrl(firstRemote)
                        .map((url) => url as string | null)
                        .orElse(() => FireflyOkAsync(null));
                });
            });
    }
}

/**
 * Creates a git service instance.
 */
export function createGitService(cwd: string): IGitService {
    return new DefaultGitService(cwd);
}
