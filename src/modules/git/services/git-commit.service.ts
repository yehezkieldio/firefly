import { err, ok } from "neverthrow";
import type { GitConfigService } from "#/modules/git/services/git-config.service";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitCommitService {
    constructor(private readonly config: GitConfigService) {}

    async create(message: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const canSignResult = await this.config.canSign();
        if (canSignResult.isErr()) return err(canSignResult.error);
        const shouldSign = canSignResult.value;

        const args = ["commit", "-m", message];
        if (shouldSign) {
            args.push("-S");
        }

        const commitResult = await executeGitCommand(args, { dryRun });
        if (commitResult.isErr()) return err(commitResult.error);

        return ok();
    }

    async resetLast(hard = false, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["reset", "--soft", "HEAD~1"];
        if (hard) {
            args[1] = "--hard";
        }

        const resetResult = await executeGitCommand(args, { dryRun });
        if (resetResult.isErr()) return err(resetResult.error);

        return ok();
    }

    async restoreFileToHead(filePath: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["restore", "--source", "HEAD", "--", filePath];
        const restoreResult = await executeGitCommand(args, { dryRun });
        if (restoreResult.isErr()) return err(restoreResult.error);

        return ok();
    }
}
