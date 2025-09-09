import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitStagingService {
    async stageAll(): Promise<FireflyResult<void>> {
        const addResult = await executeGitCommand(["add", "."]);
        if (addResult.isErr()) return err(addResult.error);

        return ok();
    }

    async stageFile(filePath: string): Promise<FireflyResult<void>> {
        const addResult = await executeGitCommand(["add", filePath]);
        if (addResult.isErr()) return err(addResult.error);

        return ok();
    }

    async stageFiles(filePaths: string[]): Promise<FireflyResult<void>> {
        const addResult = await executeGitCommand(["add", ...filePaths]);
        if (addResult.isErr()) return err(addResult.error);

        return ok();
    }

    async unstageAll(): Promise<FireflyResult<void>> {
        const resetResult = await executeGitCommand(["reset"]);
        if (resetResult.isErr()) return err(resetResult.error);

        return ok();
    }

    async unstageFile(filePath: string): Promise<FireflyResult<void>> {
        const resetResult = await executeGitCommand(["reset", "HEAD", "--", filePath]);
        if (resetResult.isErr()) return err(resetResult.error);

        return ok();
    }

    async unstageFiles(filePaths: string[]): Promise<FireflyResult<void>> {
        const resetResult = await executeGitCommand(["reset", "HEAD", "--", ...filePaths]);
        if (resetResult.isErr()) return err(resetResult.error);

        return ok();
    }
}
