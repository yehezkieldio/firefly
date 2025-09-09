import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

const CURRENT_BRANCH_MARKER_REGEX = /^\*\s*/;
const REMOTES_PREFIX_REGEX = /^remotes\//;

export interface BranchInfo {
    name: string;
    isCurrent: boolean;
    isRemote: boolean;
    upstream?: string;
}

export class GitBranchService {
    async currentBranch(): Promise<FireflyResult<string>> {
        logger.verbose("GitBranchService: Getting current branch...");

        const branchResult = await executeGitCommand(["branch", "--show-current"]);
        if (branchResult.isErr()) return err(branchResult.error);

        const branch = branchResult.value.trim();
        if (!branch) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "No current branch found. You may be in a detached HEAD state.",
                    source: "git/git-branch-service",
                }),
            );
        }

        logger.verbose(`GitBranchService: Current branch is "${branch}"`);
        return ok(branch);
    }

    async listBranches(includeRemote = false): Promise<FireflyResult<BranchInfo[]>> {
        logger.verbose(`GitBranchService: Listing ${includeRemote ? "all" : "local"} branches...`);

        const args = ["branch"];
        if (includeRemote) {
            args.push("-a");
        }

        const branchResult = await executeGitCommand(args);
        if (branchResult.isErr()) return err(branchResult.error);

        const branches = branchResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => this.parseBranchLine(line));

        logger.verbose(`GitBranchService: Found ${branches.length} ${includeRemote ? "total" : "local"} branches.`);
        return ok(branches);
    }

    async isProvidedBranchValid(branchName: string): Promise<FireflyResult<boolean>> {
        logger.verbose(`GitBranchService: Checking if branch "${branchName}" is valid...`);

        // Check if branch exists locally
        const localBranchesResult = await this.listBranches(false);
        if (localBranchesResult.isErr()) return err(localBranchesResult.error);

        const localExists = localBranchesResult.value.some((branch) => branch.name === branchName && !branch.isRemote);

        if (localExists) {
            return ok(true);
        }

        // Check if branch exists remotely
        const remoteBranchesResult = await this.listBranches(true);
        if (remoteBranchesResult.isErr()) return err(remoteBranchesResult.error);

        const remoteExists = remoteBranchesResult.value.some(
            (branch) => branch.name === branchName || (branch.isRemote && branch.name.endsWith(`/${branchName}`)),
        );

        logger.verbose(`GitBranchService: Branch "${branchName}" is ${remoteExists ? "valid" : "invalid"}.`);
        return ok(remoteExists);
    }

    async isCurrentBranch(branchName: string): Promise<FireflyResult<boolean>> {
        const currentBranchResult = await this.currentBranch();
        if (currentBranchResult.isErr()) return err(currentBranchResult.error);

        const isCurrent = currentBranchResult.value === branchName;
        return ok(isCurrent);
    }

    async createBranch(branchName: string, startPoint?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["branch", branchName];
        if (startPoint) {
            args.push(startPoint);
        }

        const createResult = await executeGitCommand(args, { dryRun });
        if (createResult.isErr()) return err(createResult.error);

        return ok();
    }

    async deleteBranch(branchName: string, force = false, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["branch"];
        args.push(force ? "-D" : "-d");
        args.push(branchName);

        const deleteResult = await executeGitCommand(args, { dryRun });
        if (deleteResult.isErr()) return err(deleteResult.error);

        return ok();
    }

    async switchToBranch(
        branchName: string,
        createIfNotExists = false,
        dryRun?: boolean,
    ): Promise<FireflyResult<void>> {
        const args = ["switch"];
        if (createIfNotExists) {
            args.push("-c");
        }
        args.push(branchName);

        const switchResult = await executeGitCommand(args, { dryRun });
        if (switchResult.isErr()) return err(switchResult.error);

        return ok();
    }

    async getUpstreamBranch(branchName?: string): Promise<FireflyResult<string | null>> {
        const branch = branchName || "HEAD";
        const upstreamResult = await executeGitCommand([
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            `${branch}@{u}`,
        ]);

        if (upstreamResult.isErr()) {
            // If there's no upstream, return null instead of error
            return ok(null);
        }

        const upstream = upstreamResult.value.trim();
        return ok(upstream || null);
    }

    async hasUpstream(branchName?: string): Promise<FireflyResult<boolean>> {
        const upstreamResult = await this.getUpstreamBranch(branchName);
        if (upstreamResult.isErr()) return err(upstreamResult.error);

        return ok(upstreamResult.value !== null);
    }

    private parseBranchLine(line: string): BranchInfo {
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
}
