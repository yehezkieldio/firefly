import { errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { GitProvider } from "#/modules/git/git.provider";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, wrapPromise } from "#/shared/utils/result.util";

export class PushTagTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "push-tag";
    readonly description = "Pushes the tag to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(PushCommitTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        return ok(!config.skipGit);
    }

    getNextTasks(_context: ReleaseTaskContext): FireflyResult<string[]> {
        return ok([]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const config = context.getConfig();
        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });
        const tagName = releaseTemplateResolverService.tagName(context.getConfig().tagName);
        const remoteResultAsync = wrapPromise(gitProvider.remote.getCurrentRemote());

        return remoteResultAsync
            .andThen((remoteName) => {
                if (remoteName.isErr()) {
                    return errAsync(remoteName.error);
                }

                return wrapPromise(gitProvider.push.pushTag(tagName, remoteName.value, config.dryRun));
            })
            .orElse(() => {
                return wrapPromise(gitProvider.push.pushTag(tagName, "origin", config.dryRun));
            })
            .map(() => {
                logger.success("Pushed tag to remote repository");
            });
    }
}
