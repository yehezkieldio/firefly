import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitStatusService {
    async isWorkingDirectoryClean(): Promise<FireflyResult<boolean>> {
        const statusResult = await executeGitCommand(["status", "--porcelain"]);
        if (statusResult.isErr()) {
            return err(statusResult.error);
        }

        const statusOutput = statusResult.value.trim();
        const isClean = statusOutput.length === 0;

        return ok(isClean);
    }
}
