import { join } from "node:path";
import { colors } from "consola/utils";
import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ChangelogGeneratorService } from "#/modules/changelog/services/changelog-generator.service";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { GitProvider } from "#/modules/git/git.provider";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask, GitFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class GenerateChangelogTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "generate-changelog";
    readonly description = "Generates the changelog based on the current release context.";

    getDependencies(): string[] {
        return [taskRef(ChangelogFlowControllerTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(!config.skipChangelog);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(GitFlowControllerTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const changelogPath = join(process.cwd(), context.getConfig().changelogPath || "CHANGELOG.md");
        const isChangelogFileExists = ResultAsync.fromPromise(FileSystemService.exists(changelogPath), toFireflyError);

        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });

        const changelogGeneratorService = new ChangelogGeneratorService(releaseTemplateResolverService);

        return isChangelogFileExists.andThen((exists) => {
            if (exists.isErr()) {
                return errAsync(exists.error);
            }

            if (!exists.value) {
                return FileSystemService.write(changelogPath, "");
            }

            logger.info("Generating changelog...");
            return ResultAsync.fromPromise(
                changelogGeneratorService.generateChangelog(context.getConfig()),
                toFireflyError,
            ).andThen((result) => {
                if (result.isErr()) {
                    return errAsync(result.error);
                }

                logger.success(`Changelog generated at ${colors.blueBright(changelogPath)}`);
                context.set("changelogContent", result.value);
                return okAsync();
            });
        });
    }

    canUndo(): boolean {
        return true;
    }

    undo(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const changelogPath = join(process.cwd(), context.getConfig().changelogPath || "CHANGELOG.md");
        const changelogContent = context.get("changelogContent");
        if (!changelogContent) {
            return errAsync(
                toFireflyError({
                    code: "NOT_FOUND",
                    message: "Changelog content not found in context, cannot undo changelog generation.",
                }),
            );
        }

        return ResultAsync.fromPromise(
            GitProvider.getInstance().commit.restoreFileToHead(changelogPath),
            toFireflyError,
        ).andThen(() => okAsync());
    }
}
