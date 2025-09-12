import { colors } from "consola/utils";
import { errAsync, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ChangelogPostProcessorService } from "#/modules/changelog/services/changelog-postprocessor.service";
import { ReleaseTemplateResolverService } from "#/modules/configuration/services/release-template-resolver.service";
import { CliffTomlService } from "#/modules/filesystem/cliff-toml.service";
import { GitHubProvider } from "#/modules/github/github.provider";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, wrapPromise } from "#/shared/utils/result.util";

export class PublishGitHubReleaseTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "publish-github-release";
    readonly description = "Publishes the release on GitHub.";

    getDependencies(): string[] {
        return [taskRef(PlatformPublishControllerTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        if (context.getConfig().skipGitHubRelease) {
            return ok(false);
        }

        return ok(true);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const config = context.getConfig();
        const changelogContentResult = context.get("changelogContent");
        let changelogContent = "";
        if (changelogContentResult.isErr()) {
            logger.warn("Changelog content is not available. Proceeding with an empty changelog.");
        } else {
            changelogContent = changelogContentResult.value as string;
        }

        const ghProvider = GitHubProvider.getInstance();
        const cliffTomlParse = CliffTomlService.getInstance(context.getBasePath());
        const releaseTemplateResolverService = new ReleaseTemplateResolverService().withContext({
            version: context.getNextVersion(),
            config: context.getConfig(),
        });
        const releaseTitle = releaseTemplateResolverService.releaseTitle(context.getConfig().releaseTitle);
        const tagName = releaseTemplateResolverService.tagName(context.getConfig().tagName);
        const changelogPostProcessor = new ChangelogPostProcessorService(cliffTomlParse);
        const processChangelog = wrapPromise(changelogPostProcessor.process(changelogContent));

        const releaseStatus =
            [
                config.releaseDraft ? "draft" : null,
                config.releasePreRelease ? "pre-release" : null,
                config.releaseLatest ? "latest" : null,
            ]
                .filter((status) => status !== null)
                .join(", ") || "normal";

        logger.info(`Publishing a ${colors.gray(releaseStatus)} GitHub release.`);

        return processChangelog
            .andThen((changelog) => {
                if (changelog.isErr()) {
                    return errAsync(changelog.error);
                }

                const release = ghProvider.release.createRelease({
                    title: releaseTitle,
                    tag: tagName,
                    content: changelog.value,
                    latest: config.releaseLatest,
                    draft: config.releaseDraft,
                    prerelease: config.releasePreRelease,
                    dryRun: config.dryRun,
                });

                return wrapPromise(release);
            })
            .map(() => {
                logger.success("Pushed GitHub release to remote repository.");
            });
    }
}
