import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitPushService {
    async push(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(
            `GitPushService: Pushing to remote "${remote}"${branch ? ` branch "${branch}"` : ""}${dryRun ? " (dry run)" : ""}...`,
        );

        const args = ["push", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Push completed successfully.");
        return ok();
    }

    async pushTags(remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(`GitPushService: Pushing tags to remote "${remote}"${dryRun ? " (dry run)" : ""}...`);

        const pushResult = await executeGitCommand(["push", remote, "--tags"], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Tags push completed successfully.");
        return ok();
    }

    async pushFollowTags(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(
            `GitPushService: Pushing with --follow-tags to remote "${remote}"${branch ? ` branch "${branch}"` : ""}${
                dryRun ? " (dry run)" : ""
            }...`,
        );

        const args = ["push", "--follow-tags", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Push with --follow-tags completed successfully.");
        return ok();
    }

    async pushTag(tagName: string, remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(
            `GitPushService: Pushing tag "${tagName}" to remote "${remote}"${dryRun ? " (dry run)" : ""}...`,
        );

        const pushResult = await executeGitCommand(["push", remote, tagName], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Tag push completed successfully.");
        return ok();
    }

    async pushDeleteRemoteTag(tagName: string, remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(
            `GitPushService: Deleting remote tag "${tagName}" from remote "${remote}"${dryRun ? " (dry run)" : ""}...`,
        );

        const pushResult = await executeGitCommand(["push", remote, "--delete", tagName], { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Remote tag deleted successfully.");
        return ok();
    }

    async pushForce(remote = "origin", branch?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(
            `GitPushService: Force pushing to remote "${remote}"${branch ? ` branch "${branch}"` : ""}${
                dryRun ? " (dry run)" : ""
            }...`,
        );

        const args = ["push", "--force-with-lease", remote];

        if (branch) {
            args.push(branch);
        }

        const pushResult = await executeGitCommand(args, { dryRun });
        if (pushResult.isErr()) return err(pushResult.error);

        logger.verbose("GitPushService: Push completed successfully.");
        return ok();
    }

    async getRemoteUrl(remote = "origin"): Promise<FireflyResult<string>> {
        logger.verbose(`GitPushService: Getting URL for remote "${remote}"`);

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

        logger.verbose(`GitPushService: URL for remote "${remote}": ${urlResult.value.trim()}`);
        return ok(urlResult.value.trim());
    }

    async hasRemote(remote = "origin"): Promise<FireflyResult<boolean>> {
        logger.verbose(`GitPushService: Checking if remote "${remote}" exists...`);

        const remoteResult = await executeGitCommand(["remote"]);
        if (remoteResult.isErr()) return err(remoteResult.error);

        const remotes = remoteResult.value
            .trim()
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.length > 0);

        logger.verbose(`GitPushService: Available remotes: ${remotes.join(", ")}`);
        return ok(remotes.includes(remote));
    }
}
