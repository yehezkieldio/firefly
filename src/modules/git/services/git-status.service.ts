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
}
