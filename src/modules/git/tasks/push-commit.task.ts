import { errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { GitProvider } from "#/modules/git/git.provider";
import { CreateTagTask } from "#/modules/git/tasks/create-tag.task";
import { PushTagTask } from "#/modules/git/tasks/push-tag.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, wrapPromise } from "#/shared/utils/result.util";

export class PushCommitTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "push-commit";
    readonly description = "Pushes the commit to the remote repository.";

    getDependencies(): string[] {
        return [taskRef(CreateTagTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        if (config.skipPush) {
            return ok(false);
        }

        return ok(!config.skipGit);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGit) {
            return ok([]);
        }

        return ok([taskRef(PushTagTask)]);
    }

    getSkipThroughTasks(context?: ReleaseTaskContext | undefined): FireflyResult<string[]> {
        const config = context?.getConfig();

        if (config?.skipPush) {
            return ok([taskRef(PlatformPublishControllerTask)]);
        }

        if (config?.skipGit) {
            return ok([]);
        }

        return ok([taskRef(PushCommitTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const config = context.getConfig();
        const remoteResultAsync = wrapPromise(gitProvider.remote.getCurrentRemote());

        return remoteResultAsync
            .andThen((remoteName) => {
                if (remoteName.isErr()) {
                    return errAsync(remoteName.error);
                }

                return wrapPromise(gitProvider.push.push(remoteName.value, config.branch, config.dryRun));
            })
            .orElse(() => {
                return wrapPromise(gitProvider.push.push("origin", config.branch, config.dryRun));
            })
            .map(() => {
                logger.success("Pushed commit to remote repository.");
            });
    }

    canUndo(): boolean {
        return true;
    }

    undo(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });
        const commitMessage = releaseTemplateResolverService.commitMessage(context.getConfig().commitMessage);
        const config = context.getConfig();

        const remoteResultAsync = wrapPromise(gitProvider.remote.getCurrentRemote());

        return remoteResultAsync
            .andThen((remoteName) => {
                if (remoteName.isErr()) {
                    return errAsync(remoteName.error);
                }

                return wrapPromise(
                    gitProvider.rollback.rollbackLatestCommitIfMessageMatches(
                        commitMessage,
                        config.branch as string,
                        remoteName.value,
                        false,
                        config.dryRun,
                    ),
                );
            })
            .orElse(() => {
                return wrapPromise(
                    gitProvider.rollback.rollbackLatestCommitIfMessageMatches(
                        commitMessage,
                        config.branch as string,
                        "origin",
                        false,
                        config.dryRun,
                    ),
                );
            })
            .map(() => {
                logger.success("Undid push commit to remote repository.");
            });
    }
}
