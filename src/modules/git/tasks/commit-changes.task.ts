import { colors } from "consola/utils";
import { ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { GitProvider } from "#/modules/git/git.provider";
import { CreateTagTask } from "#/modules/git/tasks/create-tag.task";
import { StageChangesTask } from "#/modules/git/tasks/stage-changes.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, wrapPromise } from "#/shared/utils/result.util";

export class CommitChangesTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "commit-changes";
    readonly description = "Commits the changes for the release.";

    getDependencies(): string[] {
        return [taskRef(StageChangesTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipGit);
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();

        if (config.skipGit) {
            return ok([]);
        }

        return ok([taskRef(CreateTagTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });
        const commitMessage = releaseTemplateResolverService.commitMessage(context.getConfig().commitMessage);

        return wrapPromise(gitProvider.commit.create(commitMessage, context.getConfig().dryRun)).map(() => {
            logger.info(`Committed changes with message: ${colors.gray(commitMessage)}`);
        });
    }

    canUndo(): boolean {
        return true;
    }

    undo(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const config = context.getConfig();

        return wrapPromise(gitProvider.commit.resetLast(false, config.dryRun))
            .andTee((result) => {
                if (result.isErr()) {
                    logger.error(`Failed to reset last commit: ${result.error.message}`);
                } else {
                    logger.verbose("CommitChangesTask: Last commit reset successfully.");
                }
            })
            .map(() => {});
    }
}
