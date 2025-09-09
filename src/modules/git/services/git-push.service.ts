import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitPushService {
    async push(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["push", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async pushTags(remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        const pushResult = await executeGitCommand(["push", remote, "--tags"], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async pushFollowTags(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["push", "--follow-tags", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async pushTag(tagName: string, remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        const pushResult = await executeGitCommand(["push", remote, tagName], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async pushDeleteRemoteTag(tagName: string, remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        const pushResult = await executeGitCommand(["push", remote, "--delete", tagName], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async pushForce(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const args = ["push", "--force-with-lease", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        return ok();
    }

    async getRemoteUrl(remote = "origin"): Promise<FireflyResult<string>> {
        const urlResult = await executeGitCommand(["remote", "get-url", remote]);
        if (urlResult.isErr()) {
            if (urlResult.error.message.includes("No such remote")) {
                return err(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `Remote "${remote}" does not exist.`,
                        source: "git/git-push-service",
                    }),
                );
            }
            return err(urlResult.error);
        }

        return ok(urlResult.value.trim());
    }

    async hasRemote(remote = "origin"): Promise<FireflyResult<boolean>> {
        const remoteResult = await executeGitCommand(["remote"]);
        if (remoteResult.isErr()) return err(remoteResult.error);

        const remotes = remoteResult.value
            .trim()
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.length > 0);

        return ok(remotes.includes(remote));
    }
}
