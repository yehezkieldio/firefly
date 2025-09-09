import { err, ok } from "neverthrow";
import type { GitPushService } from "#/modules/git/services/git-push.service";
import type { GitTagService } from "#/modules/git/services/git-tag.service";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitRollbackService {
    constructor(
        private readonly pushService: GitPushService,
        private readonly tagService: GitTagService,
    ) {}

    async rollbackPushedTags(tagNames: string[], remote = "origin", dryRun?: boolean): Promise<FireflyResult<void>> {
        // First, verify all tags exist locally before attempting rollback
        for (const tagName of tagNames) {
            const tagExistsResult = await this.tagService.exists(tagName);
            if (tagExistsResult.isErr()) return err(tagExistsResult.error);

            if (!tagExistsResult.value) {
                return err(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `Tag "${tagName}" does not exist locally. Cannot rollback.`,
                        source: "git/git-rollback-service",
                    }),
                );
            }
        }

        // Delete remote tags
        for (const tagName of tagNames) {
            const deleteRemoteResult = await this.pushService.pushDeleteRemoteTag(tagName, remote, dryRun);
            if (deleteRemoteResult.isErr()) {
                return err(
                    createFireflyError({
                        code: "FAILED",
                        message: `Failed to delete remote tag "${tagName}": ${deleteRemoteResult.error.message}`,
                        source: "git/git-rollback-service",
                        cause: deleteRemoteResult.error,
                    }),
                );
            }
        }

        // Delete local tags
        for (const tagName of tagNames) {
            const deleteLocalResult = await this.tagService.deleteLocal(tagName, dryRun);
            if (deleteLocalResult.isErr()) {
                return err(
                    createFireflyError({
                        code: "FAILED",
                        message: `Failed to delete local tag "${tagName}": ${deleteLocalResult.error.message}`,
                        source: "git/git-rollback-service",
                        cause: deleteLocalResult.error,
                    }),
                );
            }
        }

        return ok();
    }

    async rollbackPushedCommit(
        branch: string,
        commitHash: string,
        remote = "origin",
        dryRun?: boolean,
    ): Promise<FireflyResult<void>> {
        // Verify the commit exists
        const commitExistsResult = await this.verifyCommitExists(commitHash);
        if (commitExistsResult.isErr()) return err(commitExistsResult.error);

        if (!commitExistsResult.value) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Commit "${commitHash}" does not exist.`,
                    source: "git/git-rollback-service",
                }),
            );
        }

        // Create a revert commit
        const revertResult = await executeGitCommand(["revert", "--no-edit", commitHash], { dryRun });
        if (revertResult.isErr()) {
            return err(
                createFireflyError({
                    code: "FAILED",
                    message: `Failed to revert commit "${commitHash}": ${revertResult.error.message}`,
                    source: "git/git-rollback-service",
                    cause: revertResult.error,
                }),
            );
        }

        // Push the revert commit
        const pushResult = await this.pushService.push(remote, branch, dryRun);
        if (pushResult.isErr()) {
            return err(
                createFireflyError({
                    code: "FAILED",
                    message: `Failed to push revert commit: ${pushResult.error.message}`,
                    source: "git/git-rollback-service",
                    cause: pushResult.error,
                }),
            );
        }

        return ok();
    }

    async rollbackToCommit(
        commitHash: string,
        branch: string,
        remote = "origin",
        force = false,
        dryRun?: boolean,
    ): Promise<FireflyResult<void>> {
        // Verify the commit exists
        const commitExistsResult = await this.verifyCommitExists(commitHash);
        if (commitExistsResult.isErr()) return err(commitExistsResult.error);

        if (!commitExistsResult.value) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Commit "${commitHash}" does not exist.`,
                    source: "git/git-rollback-service",
                }),
            );
        }

        // Reset to the specified commit
        const resetArgs = ["reset", "--hard", commitHash];
        const resetResult = await executeGitCommand(resetArgs, { dryRun });
        if (resetResult.isErr()) {
            return err(
                createFireflyError({
                    code: "FAILED",
                    message: `Failed to reset to commit "${commitHash}": ${resetResult.error.message}`,
                    source: "git/git-rollback-service",
                    cause: resetResult.error,
                }),
            );
        }

        // Force push the rollback
        if (force) {
            const forcePushResult = await this.pushService.pushForce(remote, branch, dryRun);
            if (forcePushResult.isErr()) {
                return err(
                    createFireflyError({
                        code: "FAILED",
                        message: `Failed to force push rollback: ${forcePushResult.error.message}`,
                        source: "git/git-rollback-service",
                        cause: forcePushResult.error,
                    }),
                );
            }
        } else {
            const pushResult = await this.pushService.push(remote, branch, dryRun);
            if (pushResult.isErr()) {
                return err(
                    createFireflyError({
                        code: "FAILED",
                        message: `Failed to push rollback: ${pushResult.error.message}`,
                        source: "git/git-rollback-service",
                        cause: pushResult.error,
                    }),
                );
            }
        }

        return ok();
    }

    private async verifyCommitExists(commitHash: string): Promise<FireflyResult<boolean>> {
        const catFileResult = await executeGitCommand(["cat-file", "-e", commitHash]);
        if (catFileResult.isErr()) {
            // If cat-file fails, the commit doesn't exist
            return ok(false);
        }

        return ok(true);
    }
}
