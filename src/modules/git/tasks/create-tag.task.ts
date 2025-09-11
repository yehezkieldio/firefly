import { colors } from "consola/utils";
import { ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { GitProvider } from "#/modules/git/git.provider";
import { CommitChangesTask } from "#/modules/git/tasks/commit-changes.task";
import { PushCommitTask } from "#/modules/git/tasks/push-commit.task";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, wrapPromise } from "#/shared/utils/result.util";

export class CreateTagTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "create-tag";
    readonly description = "Creates a new tag for the release.";

    getDependencies(): string[] {
        return [taskRef(CommitChangesTask)];
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

        return ok([taskRef(PushCommitTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const gitProvider = GitProvider.getInstance();
        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });
        const tagName = releaseTemplateResolverService.tagName(context.getConfig().tagName);

        return wrapPromise(gitProvider.tag.createTag(tagName, undefined, context.getConfig().dryRun)).map(() => {
            logger.info(`Created tag: ${colors.gray(tagName)}`);
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

        const tagName = releaseTemplateResolverService.tagName(context.getConfig().tagName);

        return wrapPromise(gitProvider.tag.deleteLocal(tagName, context.getConfig().dryRun)).map(() => {
            logger.info(`Deleted tag: ${colors.gray(tagName)}`);
        });
    }
}
