import { basename } from "node:path";
import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitStatusService {
    async isWorkingDirectoryClean(): Promise<FireflyResult<boolean>> {
        logger.verbose("GitStatusService: Checking if working directory is clean");

        const statusResult = await executeGitCommand(["status", "--porcelain"]);
        if (statusResult.isErr()) {
            return err(statusResult.error);
        }

        const statusOutput = statusResult.value.trim();
        const isClean = statusOutput.length === 0;

        logger.verbose(`GitStatusService: Working directory ${isClean ? "clean" : "not clean"}`);
        return ok(isClean);
    }

    async getModifiedFiles(dryRun?: boolean): Promise<FireflyResult<string[]>> {
        logger.verbose("GitStatusService: Retrieving modified files");

        const statusResult = await executeGitCommand(["status", "--porcelain"], { dryRun });
        if (statusResult.isErr()) {
            return err(statusResult.error);
        }

        const statusOutput = statusResult.value.trim();
        if (statusOutput.length === 0) {
            logger.verbose("GitStatusService: No modified files found");
            return ok([]);
        }

        const modifiedFiles = statusOutput.split("\n").map((line) => line.slice(2).trim());

        logger.verbose(`GitStatusService: Found modified files: ${modifiedFiles.join(", ")}`);
        return ok(modifiedFiles);
    }

    async getUnstagedFiles(dryRun?: boolean): Promise<FireflyResult<string[]>> {
        logger.verbose("GitStatusService: Retrieving unstaged files");

        const statusResult = await executeGitCommand(["status", "--porcelain"], { dryRun });
        if (statusResult.isErr()) {
            return err(statusResult.error);
        }

        const statusOutput = statusResult.value;
        if (statusOutput.length === 0) {
            logger.verbose("GitStatusService: No unstaged files found");
            return ok([]);
        }

        const unstagedFiles = statusOutput
            .split("\n")
            .filter((line) => line.charAt(1) !== " ")
            .map((line) => line.slice(2).trim());

        logger.verbose(`GitStatusService: Found unstaged files: ${unstagedFiles.join(", ")}`);
        return ok(unstagedFiles);
    }

    async getModifiedFilesByNames(fileNames: string[], dryRun?: boolean): Promise<FireflyResult<string[]>> {
        const modifiedFilesResult = await this.getModifiedFiles(dryRun);
        if (modifiedFilesResult.isErr()) {
            return err(modifiedFilesResult.error);
        }

        const modifiedFiles = modifiedFilesResult.value;
        const filteredFiles = modifiedFiles.filter((file) =>
            fileNames.some((fileName) => file === fileName || basename(file) === basename(fileName)),
        );

        logger.verbose(`GitStatusService: Filtered modified files: ${filteredFiles.join(", ")}`);
        return ok(filteredFiles);
    }

    async getUnstagedFilesByNames(fileNames: string[], dryRun?: boolean): Promise<FireflyResult<string[]>> {
        const unstagedFilesResult = await this.getUnstagedFiles(dryRun);
        if (unstagedFilesResult.isErr()) {
            return err(unstagedFilesResult.error);
        }

        const unstagedFiles = unstagedFilesResult.value;
        const filteredFiles = unstagedFiles.filter((file) =>
            fileNames.some((fileName) => file === fileName || basename(file) === basename(fileName)),
        );

        logger.verbose(`GitStatusService: Filtered unstaged files: ${filteredFiles.join(", ")}`);
        return ok(filteredFiles);
    }
}
