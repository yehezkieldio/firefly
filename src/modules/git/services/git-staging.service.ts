import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitStagingService {
    async stageAll(): Promise<FireflyResult<void>> {
        logger.verbose("GitStagingService: Staging all changes");

        const addResult = await executeGitCommand(["add", "."]);
        if (addResult.isErr()) return err(addResult.error);

        logger.verbose("GitStagingService: All changes staged successfully");
        return ok();
    }

    async stageFile(filePath: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(`GitStagingService: Staging file ${filePath}`);

        const addResult = await executeGitCommand(["add", filePath], { dryRun });
        if (addResult.isErr()) return err(addResult.error);

        logger.verbose(`GitStagingService: File ${filePath} staged successfully`);
        return ok();
    }

    async stageFiles(filePaths: string[]): Promise<FireflyResult<void>> {
        logger.verbose(`GitStagingService: Staging files: ${filePaths.join(", ")}`);

        const addResult = await executeGitCommand(["add", ...filePaths]);
        if (addResult.isErr()) return err(addResult.error);

        logger.verbose("GitStagingService: Files staged successfully");
        return ok();
    }

    async unstageAll(): Promise<FireflyResult<void>> {
        logger.verbose("GitStagingService: Unstaging all changes");

        const resetResult = await executeGitCommand(["reset"]);
        if (resetResult.isErr()) return err(resetResult.error);

        logger.verbose("GitStagingService: All changes unstaged successfully");
        return ok();
    }

    async unstageFile(filePath: string): Promise<FireflyResult<void>> {
        logger.verbose(`GitStagingService: Unstaging file ${filePath}`);

        const resetResult = await executeGitCommand(["reset", "HEAD", "--", filePath]);
        if (resetResult.isErr()) return err(resetResult.error);

        logger.verbose(`GitStagingService: File ${filePath} unstaged successfully`);
        return ok();
    }

    async unstageFiles(filePaths: string[]): Promise<FireflyResult<void>> {
        logger.verbose(`GitStagingService: Unstaging files: ${filePaths.join(", ")}`);

        const resetResult = await executeGitCommand(["reset", "HEAD", "--", ...filePaths]);
        if (resetResult.isErr()) return err(resetResult.error);

        logger.verbose("GitStagingService: Files unstaged successfully");
        return ok();
    }
}
