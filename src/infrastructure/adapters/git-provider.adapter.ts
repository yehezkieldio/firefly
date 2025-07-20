import { err, okAsync, ResultAsync } from "neverthrow";
import type { GitProviderPort, Repository } from "#/core/ports/git-provider.port";
import { RepositorySchema } from "#/core/ports/git-provider.port";
import { CommandExecutionError } from "#/shared/utils/error";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class GitProviderAdapter implements GitProviderPort {
    private static readonly REPOSITORY_PATTERNS = [
        /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
        /^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/,
        /^https:\/\/gitlab\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
        /^git@gitlab\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/,
        /^https?:\/\/[^/]+\/([^/]+)\/([^/.]+?)(?:\.git)?$/,
        /^git@[^:]+:([^/]+)\/([^/.]+?)(?:\.git)?$/,
    ] as const;

    async stageChanges(): Promise<AsyncFireflyResult<void>> {
        const result = await this.exec(["add", "."]);
        return result.isErr()
            ? err(new CommandExecutionError("Failed to stage changes", result.error))
            : okAsync(undefined);
    }

    async createCommit(message: string): Promise<AsyncFireflyResult<void>> {
        if (!message?.trim()) {
            return err(new CommandExecutionError("Commit message cannot be empty"));
        }

        const result = await this.exec(["commit", "-m", message]);
        return result.isErr()
            ? err(new CommandExecutionError("Failed to create commit", result.error))
            : okAsync(undefined);
    }

    async resetLastCommit(): Promise<AsyncFireflyResult<void>> {
        const result = await this.exec(["reset", "--mixed", "HEAD~1"]);
        return result.isErr()
            ? err(new CommandExecutionError("Failed to reset last commit", result.error))
            : okAsync(undefined);
    }

    async restoreFileToHead(pathToFile: string): Promise<AsyncFireflyResult<void>> {
        if (!pathToFile?.trim()) {
            return err(new CommandExecutionError("File path cannot be empty"));
        }

        const result = await this.exec(["checkout", "HEAD", "--", pathToFile]);
        return result.isErr()
            ? err(new CommandExecutionError(`Failed to checkout file: ${pathToFile}`, result.error))
            : okAsync(undefined);
    }

    async createTag(tag: string, message?: string): Promise<AsyncFireflyResult<void>> {
        if (!tag?.trim()) {
            return err(new CommandExecutionError("Tag name cannot be empty"));
        }

        const canSignResult = await this.canSignTag();
        if (canSignResult.isErr()) {
            return err(canSignResult.error);
        }

        const args = this.buildTagArgs(tag, canSignResult.value, message);
        const execResult = await this.exec(args);

        if (execResult.isErr()) {
            return err(new CommandExecutionError("Failed to create tag", execResult.error));
        }

        return this.verifyTagCreation(tag);
    }

    private buildTagArgs(tag: string, shouldSign: boolean, message?: string): string[] {
        const args = ["tag", tag];

        if (message) {
            args.push("-m", message);
        }

        if (shouldSign) {
            args.push("-s");
        }

        return args;
    }

    private async verifyTagCreation(tag: string): Promise<AsyncFireflyResult<void>> {
        const tagExists = await this.checkIfTagExists(tag);

        if (tagExists.isErr()) {
            return err(tagExists.error);
        }

        return tagExists.value
            ? okAsync(undefined)
            : err(new CommandExecutionError(`Tag ${tag} was not created successfully`));
    }

    private async canSignTag(): Promise<AsyncFireflyResult<boolean>> {
        const result = await this.exec(["config", "--get", "user.signingkey"]);

        if (result.isErr()) {
            return err(new CommandExecutionError("Failed to check if tag signing is enabled", result.error));
        }

        const isEnabled = result.value.trim().length > 0;
        return okAsync(isEnabled);
    }

    private async checkIfTagExists(tag: string): Promise<AsyncFireflyResult<boolean>> {
        const result = await this.exec(["tag", "-l", tag]);

        if (result.isErr()) {
            return err(new CommandExecutionError("Failed to check if tag exists", result.error));
        }

        return okAsync(result.value.trim() !== "");
    }

    async deleteLocalTag(tag: string): Promise<AsyncFireflyResult<void>> {
        if (!tag?.trim()) {
            return err(new CommandExecutionError("Tag name cannot be empty"));
        }

        const result = await this.exec(["tag", "-d", tag]);
        return result.isErr()
            ? err(new CommandExecutionError(`Failed to delete local tag: ${tag}`, result.error))
            : okAsync(undefined);
    }

    async isInsideGitRepository(): Promise<AsyncFireflyResult<boolean>> {
        const result = await this.exec(["rev-parse", "--is-inside-work-tree"]);

        if (result.isErr()) {
            return err(new CommandExecutionError("Failed to check if inside a git repository", result.error));
        }

        return okAsync(result.value.trim() === "true");
    }

    async getRootDirection(): Promise<AsyncFireflyResult<string>> {
        const result = await this.exec(["rev-parse", "--show-prefix"]);

        if (result.isErr()) {
            return err(new CommandExecutionError("Failed to get root directory", result.error));
        }

        const path = result.value.trim();
        return okAsync(this.buildRootPath(path));
    }

    private buildRootPath(path: string): string {
        if (path === "") {
            return ".";
        }

        return path
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean)
            .map(() => "..")
            .join("/");
    }

    async getRepositoryUrl(): Promise<AsyncFireflyResult<string>> {
        const result = await this.exec(["remote", "get-url", "origin"]);

        if (result.isErr()) {
            return err(new CommandExecutionError("Failed to get repository URL", result.error));
        }

        const url = result.value.trim();
        if (!url) {
            return err(new CommandExecutionError("Repository URL is empty"));
        }

        return okAsync(url);
    }

    async getRepository(): Promise<AsyncFireflyResult<Repository>> {
        const urlResult = await this.getRepositoryUrl();
        if (urlResult.isErr()) {
            return err(urlResult.error);
        }

        const repository = this.extractRepository(urlResult.value);
        return repository
            ? okAsync(repository)
            : err(new CommandExecutionError(`Failed to extract repository from URL: ${urlResult.value}`));
    }

    extractRepository(url: string): Repository | null {
        if (!url?.trim()) {
            return null;
        }

        for (const pattern of GitProviderAdapter.REPOSITORY_PATTERNS) {
            const match = url.match(pattern);
            if (match?.[1] && match?.[2]) {
                try {
                    return RepositorySchema.parse({
                        owner: match[1],
                        repository: match[2],
                    });
                } catch {
                    return null;
                }
            }
        }

        return null;
    }

    exec(args: string[]): AsyncFireflyResult<string> {
        const command = Bun.spawn(["git", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new CommandExecutionError("Failed to execute git command", e as Error)
        );
    }
}
