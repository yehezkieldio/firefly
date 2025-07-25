import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { type GitProviderPort, type Repository, RepositorySchema } from "#/core/ports/git-provider.port";
import { REPOSITORY_PATTERNS } from "#/shared/utils/constants";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export class GitProviderAdapter implements GitProviderPort {
    private static instance: GitProviderAdapter | null = null;

    private constructor() {}

    static getInstance(): GitProviderAdapter {
        if (!GitProviderAdapter.instance) {
            GitProviderAdapter.instance = new GitProviderAdapter();
        }
        return GitProviderAdapter.instance;
    }

    async stageChanges(): Promise<FireflyResult<void>> {
        const result = await this.exec(["add", "."]);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async stageFile(path: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        if (!path.trim()) {
            return err(new ProcessExecutionError("File path cannot be empty"));
        }

        const result = await this.exec(["add", path], dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async pushChanges(dryRun?: boolean): Promise<FireflyResult<void>> {
        const result = await this.exec(["push"], dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async pushTags(dryRun?: boolean): Promise<FireflyResult<void>> {
        const result = await this.exec(["push", "--tags"], dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async pushFollowTags(dryRun?: boolean): Promise<FireflyResult<void>> {
        const result = await this.exec(["push", "--follow-tags"], dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async rollbackPushedTags(tagName: string): Promise<FireflyResult<void>> {
        const deleteResult = await this.deleteLocalTag(tagName);
        if (deleteResult.isErr()) {
            return err(deleteResult.error);
        }

        const pushResult = await this.exec(["push", "origin", "--delete", tagName]);
        if (pushResult.isErr()) {
            return err(pushResult.error);
        }

        return ok(undefined);
    }

    async rollbackPushedCommit(branch: string): Promise<FireflyResult<void>> {
        if (!branch.trim()) {
            return err(new ProcessExecutionError("Branch name cannot be empty"));
        }

        const previousCommitResult = await this.exec(["rev-parse", "HEAD~1"]);
        if (previousCommitResult.isErr()) {
            return err(previousCommitResult.error);
        }

        const previousCommit = previousCommitResult.value.trim();
        if (!previousCommit) {
            return err(new ProcessExecutionError("Failed to get previous commit hash"));
        }

        const currentBranchResult = await this.exec(["rev-parse", "--abbrev-ref", "HEAD"]);
        if (currentBranchResult.isErr()) {
            return err(currentBranchResult.error);
        }

        const currentBranch = currentBranchResult.value.trim();
        if (!currentBranch) {
            return err(new ProcessExecutionError("Failed to get current branch name"));
        }

        const pushResult = await this.exec(["push", "--force", "origin", `${previousCommit}:${branch}`]);
        if (pushResult.isErr()) {
            return err(pushResult.error);
        }

        return ok(undefined);
    }

    async getFilteredModifiedFiles(dryRun?: boolean): Promise<FireflyResult<string[]>> {
        if (dryRun) {
            return ok(["package.json", "CHANGELOG.md"]);
        }

        const result = await this.exec(["status", "--porcelain=v1"], dryRun);
        if (result.isErr()) {
            return err(result.error);
        }

        const lines = result.value.split("\n").filter((line) => line.trim() !== "");
        const modifiedFiles: string[] = [];

        for (const line of lines) {
            const statusPrefix = line.substring(0, 2);
            const filePath = line.substring(3).trim();

            if (
                statusPrefix.includes("M") || // Modified (staged or unstaged)
                statusPrefix.includes("A") || // Added (staged, but represents a "change")
                statusPrefix.includes("D") || // Deleted (staged, but represents a "change")
                statusPrefix === "??" // Untracked
            ) {
                modifiedFiles.push(filePath);
            }
        }

        const filtered = modifiedFiles.filter((file) => file === "CHANGELOG.md" || file === "package.json");

        if (filtered.length === 0) {
            return err(new ProcessExecutionError("No relevant modified files found"));
        }

        return ok(filtered);
    }

    async createCommit(message: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        if (!message.trim()) {
            return err(new ProcessExecutionError("Commit message cannot be empty"));
        }

        const canSignResult = await this.canSignCommit();
        if (canSignResult.isErr()) {
            return err(canSignResult.error);
        }
        const shouldSign = canSignResult.value;

        const args = ["commit", "-m", message];
        if (shouldSign) {
            args.push("-S");
        }

        const result = await this.exec(args, dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    private async canSignCommit(): Promise<FireflyResult<boolean>> {
        const gpgSignResult = await this.getConfigWithFallback("commit.gpgSign");
        if (gpgSignResult.isErr()) {
            return err(gpgSignResult.error);
        }

        const signingKeyResult = await this.getConfigWithFallback("user.signingkey");
        if (signingKeyResult.isErr()) {
            return err(signingKeyResult.error);
        }

        if (!(gpgSignResult.value.trim() && signingKeyResult.value.trim())) {
            return ok(false);
        }

        return ok(gpgSignResult.value.trim() === "true");
    }

    async resetLastCommit(): Promise<FireflyResult<void>> {
        const result = await this.exec(["reset", "--mixed", "HEAD~1"]);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async restoreFileToHead(pathToFile: string): Promise<FireflyResult<void>> {
        const result = await this.exec(["checkout", "HEAD", "--", pathToFile]);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async createTag(tag: string, message?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const canSignResult = await this.canSignTag();
        if (canSignResult.isErr()) {
            return err(canSignResult.error);
        }

        const shouldSign = canSignResult.value;

        const tagExistsResult = await this.checkIfTagExists(tag, dryRun);
        if (tagExistsResult.isErr()) {
            return err(tagExistsResult.error);
        }

        if (tagExistsResult.value) {
            return err(new ProcessExecutionError(`Tag '${tag}' already exists`));
        }

        const args = this.buildTagArgs(tag, shouldSign, message);
        const result = await this.exec(args, dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
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

    private async canSignTag(): Promise<FireflyResult<boolean>> {
        const result = await this.exec(["tag", "-l"]);
        if (result.isErr()) {
            return err(result.error);
        }

        const gpgSignResult = await this.getConfigWithFallback("tag.gpgSign");
        if (gpgSignResult.isErr()) {
            return err(gpgSignResult.error);
        }

        const signingKeyResult = await this.getConfigWithFallback("user.signingkey");
        if (signingKeyResult.isErr()) {
            return err(signingKeyResult.error);
        }

        if (!(gpgSignResult.value.trim() && signingKeyResult.value.trim())) {
            return ok(false);
        }

        return ok(gpgSignResult.value.trim() === "true");
    }

    private async getConfigWithFallback(key: string): Promise<FireflyResult<string>> {
        const localResult = await this.exec(["config", "--get", key]);
        if (localResult.isErr()) {
            return err(localResult.error);
        }
        const localValue = localResult.value.trim();
        if (localValue) {
            return ok(localValue);
        }

        const globalResult = await this.exec(["config", "--get", "--global", key]);
        if (globalResult.isErr()) {
            return err(globalResult.error);
        }

        return ok(globalResult.value.trim());
    }

    private async checkIfTagExists(tag: string, dryRun?: boolean): Promise<FireflyResult<boolean>> {
        const result = await this.exec(["tag", "-l", tag], dryRun);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(result.value.trim() === tag);
    }

    async deleteLocalTag(tag: string): Promise<FireflyResult<void>> {
        const result = await this.exec(["tag", "-d", tag]);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(undefined);
    }

    async isInsideGitRepository(): Promise<FireflyResult<boolean>> {
        const result = await this.exec(["rev-parse", "--is-inside-work-tree"]);

        if (result.isErr()) {
            return err(result.error);
        }

        return ok(result.value.trim() === "true");
    }

    async getRootDirection(): Promise<FireflyResult<string>> {
        const result = await this.exec(["rev-parse", "--show-prefix"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const rootPath = this.buildRootPath(result.value.trim());
        if (!rootPath) {
            return err(new ProcessExecutionError("Failed to determine root directory"));
        }

        return ok(rootPath);
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

    async getRepositoryUrl(): Promise<FireflyResult<string>> {
        const result = await this.exec(["remote", "get-url", "origin"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const url = result.value.trim();
        if (!url) {
            return err(new ProcessExecutionError("Failed to get repository URL"));
        }

        return ok(url);
    }

    extractRepository(url: string): FireflyResult<Repository> {
        if (!url?.trim()) {
            return err(new ConfigurationError("Repository URL is empty"));
        }

        for (const pattern of REPOSITORY_PATTERNS) {
            const match = url.match(pattern);
            if (match?.[1] && match?.[2]) {
                const parseResult = RepositorySchema.safeParse({
                    owner: match[1],
                    repository: match[2],
                });
                if (parseResult.success) {
                    return ok(parseResult.data);
                }
            }
        }

        return err(new ConfigurationError("Failed to extract repository from URL"));
    }

    async getCurrentBranch(): Promise<FireflyResult<string>> {
        const result = await this.exec(["rev-parse", "--abbrev-ref", "HEAD"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const branchName = result.value.trim();
        if (!branchName) {
            return err(new ProcessExecutionError("Failed to get current branch name"));
        }

        return ok(branchName);
    }

    async getAvailableBranches(): Promise<FireflyResult<string[]>> {
        const result = await this.exec(["branch", "--list"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const branches = result.value
            .split("\n")
            .map((branch) => branch.trim())
            .filter(Boolean);

        return ok(branches);
    }

    async isProvidedBranchValid(branch: string): Promise<FireflyResult<boolean>> {
        if (!branch.trim()) {
            return err(new ProcessExecutionError("Branch name cannot be empty"));
        }

        const branchesResult = await this.getAvailableBranches();
        if (branchesResult.isErr()) {
            return err(branchesResult.error);
        }

        const isValid = branchesResult.value.includes(branch);
        if (!isValid) {
            return err(new ProcessExecutionError(`Branch '${branch}' does not exist`));
        }

        return ok(isValid);
    }

    async isCurrentBranch(branch: string): Promise<FireflyResult<boolean>> {
        const currentBranchResult = await this.getCurrentBranch();

        if (currentBranchResult.isErr()) {
            return err(currentBranchResult.error);
        }

        return ok(currentBranchResult.value === branch);
    }

    async isWorkingDirClean(): Promise<FireflyResult<boolean>> {
        const result = await this.exec(["status", "--porcelain"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const isClean = result.value.trim() === "";
        return ok(isClean);
    }

    async hasUnpushedCommits(): Promise<FireflyResult<boolean>> {
        const result = await this.exec(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);

        if (result.isErr()) {
            return err(result.error);
        }

        const upstreamBranch = result.value.trim();
        if (!upstreamBranch) {
            return err(new ProcessExecutionError("Failed to get upstream branch"));
        }

        const compareResult = await this.exec(["rev-list", "--left-right", `${upstreamBranch}...HEAD`]);
        if (compareResult.isErr()) {
            return err(compareResult.error);
        }

        const commits = compareResult.value
            .trim()
            .split("\n")
            .filter((line) => line.startsWith("<") || line.startsWith(">"));
        const hasUnpushed = commits.some((commit) => commit.startsWith(">"));
        return ok(hasUnpushed);
    }

    exec(args: string[], dryRun?: boolean): AsyncFireflyResult<string> {
        const sideEffectCommands = ["add", "commit", "push", "tag", "reset", "checkout"];
        if (dryRun && args.some((arg) => sideEffectCommands.includes(arg))) {
            logger.verbose(`GitProviderAdapter: Dry run enabled, skipping command execution: git ${args.join(" ")}`);
            return okAsync("");
        }

        const command = Bun.spawn(["git", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new ProcessExecutionError("Failed to execute git command", e as Error)
        ).andTee(() => logger.verbose("GitProviderAdapter: Executed command:", `git ${args.join(" ")}`));
    }
}
