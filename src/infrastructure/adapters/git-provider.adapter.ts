import { consola } from "consola";
import { Repository } from "#/core/domain/repository.js";
import type { IGitProvider } from "#/core/ports/git.port.js";
import type { ArtemisResult } from "#/shared/result.js";
import { err, GitError, ok } from "#/shared/result.js";

// Declare Bun global for TypeScript
declare const Bun: {
    spawn: (
        args: string[],
        options?: { cwd?: string; stdout?: string; stderr?: string }
    ) => {
        stdout: ReadableStream;
        stderr: ReadableStream;
        exited: Promise<void>;
        exitCode: number | null;
    };
};

// Regex constants to avoid recreation
const GITHUB_URL_REGEX = /github\.com[/:]([\w-]+)\/([\w-]+)/;
const GIT_EXTENSION_REGEX = /\.git$/;

export class GitProviderAdapter implements IGitProvider {
    private readonly basePath: string;

    constructor(basePath: string = process.cwd()) {
        this.basePath = basePath;
    }

    async getCurrentRepository(): Promise<ArtemisResult<Repository>> {
        try {
            const remoteUrl = await this.getRemoteUrl();
            if (remoteUrl.isErr()) {
                return err(remoteUrl.error);
            }

            const currentBranch = await this.getCurrentBranch();
            if (currentBranch.isErr()) {
                return err(currentBranch.error);
            }

            // Parse GitHub URL to get owner/repo
            const match = remoteUrl.value.match(GITHUB_URL_REGEX);
            if (!match) {
                return err(
                    new GitError(
                        `Unable to parse repository from URL: ${remoteUrl.value}`
                    )
                );
            }

            const [, owner, repoName] = match;

            if (owner === undefined || repoName === undefined) {
                return err(
                    new GitError(
                        `Invalid repository format from URL: ${remoteUrl.value}`
                    )
                );
            }

            const cleanRepoName = repoName.replace(GIT_EXTENSION_REGEX, "");

            return ok(
                Repository.fromString(
                    `${owner}/${cleanRepoName}`,
                    currentBranch.value
                )
            );
        } catch (error) {
            consola.error("Failed to get current repository:", error);
            return err(
                new GitError(
                    "Failed to get current repository",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async isWorkingDirectoryClean(): Promise<ArtemisResult<boolean>> {
        try {
            const result = await this.runGitCommand(["status", "--porcelain"]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value.trim() === "");
        } catch (error) {
            consola.error("Failed to check working directory status:", error);
            return err(
                new GitError(
                    "Failed to check working directory status",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getCurrentBranch(): Promise<ArtemisResult<string>> {
        try {
            const result = await this.runGitCommand([
                "rev-parse",
                "--abbrev-ref",
                "HEAD",
            ]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value.trim());
        } catch (error) {
            consola.error("Failed to get current branch:", error);
            return err(
                new GitError(
                    "Failed to get current branch",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async stageAll(): Promise<ArtemisResult<void>> {
        try {
            const result = await this.runGitCommand(["add", "."]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to stage all changes:", error);
            return err(
                new GitError(
                    "Failed to stage all changes",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async stageFiles(files: string[]): Promise<ArtemisResult<void>> {
        try {
            const result = await this.runGitCommand(["add", ...files]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to stage files:", error);
            return err(
                new GitError(
                    "Failed to stage files",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async commit(message: string): Promise<ArtemisResult<void>> {
        try {
            const result = await this.runGitCommand(["commit", "-m", message]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to commit changes:", error);
            return err(
                new GitError(
                    "Failed to commit changes",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async createTag(
        tag: string,
        message?: string
    ): Promise<ArtemisResult<void>> {
        try {
            const args = ["tag"];
            if (message) {
                args.push("-a", tag, "-m", message);
            } else {
                args.push(tag);
            }

            const result = await this.runGitCommand(args);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to create tag:", error);
            return err(
                new GitError(
                    "Failed to create tag",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async push(
        remote = "origin",
        branch?: string
    ): Promise<ArtemisResult<void>> {
        try {
            const args = ["push", remote];
            if (branch) {
                args.push(branch);
            }

            const result = await this.runGitCommand(args);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to push changes:", error);
            return err(
                new GitError(
                    "Failed to push changes",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async pushTags(remote = "origin"): Promise<ArtemisResult<void>> {
        try {
            const result = await this.runGitCommand(["push", remote, "--tags"]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to push tags:", error);
            return err(
                new GitError(
                    "Failed to push tags",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getLatestTag(): Promise<ArtemisResult<string>> {
        try {
            const result = await this.runGitCommand([
                "describe",
                "--tags",
                "--abbrev=0",
            ]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value.trim());
        } catch (error) {
            consola.error("Failed to get latest tag:", error);
            return err(
                new GitError(
                    "Failed to get latest tag",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getTags(pattern?: string): Promise<ArtemisResult<string[]>> {
        try {
            const args = ["tag"];
            if (pattern) {
                args.push("-l", pattern);
            }

            const result = await this.runGitCommand(args);
            if (result.isErr()) {
                return err(result.error);
            }

            const tags = result.value.trim().split("\n").filter(Boolean);
            return ok(tags);
        } catch (error) {
            consola.error("Failed to get tags:", error);
            return err(
                new GitError(
                    "Failed to get tags",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getCommitHistory(
        from: string,
        to?: string
    ): Promise<ArtemisResult<string[]>> {
        try {
            const range = to ? `${from}..${to}` : `${from}..HEAD`;
            const result = await this.runGitCommand([
                "log",
                "--oneline",
                range,
            ]);
            if (result.isErr()) {
                return err(result.error);
            }

            const commits = result.value.trim().split("\n").filter(Boolean);
            return ok(commits);
        } catch (error) {
            consola.error("Failed to get commit history:", error);
            return err(
                new GitError(
                    "Failed to get commit history",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async hasTag(tag: string): Promise<ArtemisResult<boolean>> {
        try {
            const result = await this.runGitCommand(["tag", "-l", tag]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value.trim() !== "");
        } catch (error) {
            consola.error("Failed to check if tag exists:", error);
            return err(
                new GitError(
                    "Failed to check if tag exists",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getRemoteUrl(remote = "origin"): Promise<ArtemisResult<string>> {
        try {
            const result = await this.runGitCommand([
                "remote",
                "get-url",
                remote,
            ]);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value.trim());
        } catch (error) {
            consola.error("Failed to get remote URL:", error);
            return err(
                new GitError(
                    "Failed to get remote URL",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private async runGitCommand(
        args: string[]
    ): Promise<ArtemisResult<string>> {
        try {
            const proc = Bun.spawn(["git", ...args], {
                cwd: this.basePath,
                stdout: "pipe",
                stderr: "pipe",
            });

            const output = await new Response(proc.stdout).text();
            const error = await new Response(proc.stderr).text();

            await proc.exited;

            if (proc.exitCode !== 0) {
                return err(
                    new GitError(
                        `Git command failed: ${error || "Unknown error"}`
                    )
                );
            }

            return ok(output);
        } catch (error) {
            consola.error("Failed to run git command:", error);
            return err(
                new GitError(
                    "Failed to run git command",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }
}
