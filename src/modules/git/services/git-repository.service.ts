import path from "node:path";
import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitRepositoryService {
    async isInsideWorkTree(): Promise<FireflyResult<boolean>> {
        const workTreeResult = await executeGitCommand(["rev-parse", "--is-inside-work-tree"]);
        if (workTreeResult.isErr()) {
            // If command fails, we're not inside a git work tree
            return ok(false);
        }

        const isInsideWorkTree = workTreeResult.value.trim() === "true";
        return ok(isInsideWorkTree);
    }

    async getRootDirection(): Promise<FireflyResult<string>> {
        const rootResult = await executeGitCommand(["rev-parse", "--show-toplevel"]);
        if (rootResult.isErr()) return err(rootResult.error);

        const rootPath = rootResult.value.trim();
        const currentPath = process.cwd();

        // Calculate relative path from current directory to repository root
        const relativePath = path.relative(currentPath, rootPath);

        // If we're already at the root, return "."
        if (relativePath === "") {
            return ok(".");
        }

        return ok(relativePath);
    }

    async getRepositoryUrl(remote = "origin"): Promise<FireflyResult<string>> {
        const urlResult = await executeGitCommand(["remote", "get-url", remote]);
        if (urlResult.isErr()) {
            if (urlResult.error.message.includes("No such remote")) {
                return err(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `Remote "${remote}" does not exist.`,
                        source: "git/git-repository-service",
                    }),
                );
            }
            return err(urlResult.error);
        }

        return ok(urlResult.value.trim());
    }

    async getRepositoryName(): Promise<FireflyResult<string>> {
        const rootResult = await executeGitCommand(["rev-parse", "--show-toplevel"]);
        if (rootResult.isErr()) return err(rootResult.error);

        const rootPath = rootResult.value.trim();
        const repoName = path.basename(rootPath);

        return ok(repoName);
    }

    async isShallow(): Promise<FireflyResult<boolean>> {
        const shallowResult = await executeGitCommand(["rev-parse", "--is-shallow-repository"]);
        if (shallowResult.isErr()) {
            // If command fails, assume not shallow
            return ok(false);
        }

        const isShallow = shallowResult.value.trim() === "true";
        return ok(isShallow);
    }

    async isBare(): Promise<FireflyResult<boolean>> {
        const bareResult = await executeGitCommand(["rev-parse", "--is-bare-repository"]);
        if (bareResult.isErr()) {
            // If command fails, assume not bare
            return ok(false);
        }

        const isBare = bareResult.value.trim() === "true";
        return ok(isBare);
    }

    async getGitDirectory(): Promise<FireflyResult<string>> {
        const gitDirResult = await executeGitCommand(["rev-parse", "--git-dir"]);
        if (gitDirResult.isErr()) return err(gitDirResult.error);

        return ok(gitDirResult.value.trim());
    }

    async getWorkingDirectory(): Promise<FireflyResult<string>> {
        const workDirResult = await executeGitCommand(["rev-parse", "--show-toplevel"]);
        if (workDirResult.isErr()) return err(workDirResult.error);

        return ok(workDirResult.value.trim());
    }
}
