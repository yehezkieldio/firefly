import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitRemoteService {
    async hasUnpushedCommits(): Promise<FireflyResult<boolean>> {
        logger.verbose("GitRemoteService: Checking for unpushed commits...");

        const upstreamResult = await executeGitCommand(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
        if (upstreamResult.isErr()) return err(upstreamResult.error);

        const upstreamBranch = upstreamResult.value.trim();
        if (!upstreamBranch) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "No upstream branch found.",
                    source: "git/git-remote-service",
                }),
            );
        }

        const compareResult = await executeGitCommand(["rev-list", "--left-right", `${upstreamBranch}...HEAD`]);
        if (compareResult.isErr()) return err(compareResult.error);

        const hasUnpushed = this.hasUnpushedFromOutput(compareResult.value);

        logger.verbose(`GitRemoteService: Unpushed commits present: ${hasUnpushed}`);
        return ok(hasUnpushed);
    }

    private hasUnpushedFromOutput(output: string): boolean {
        if (!output) return false;

        const commits = output
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && (line.startsWith("<") || line.startsWith(">")));

        return commits.some((commit) => commit.startsWith(">"));
    }
}
