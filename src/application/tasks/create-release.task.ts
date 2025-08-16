import { join } from "node:path";
import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { GithubCliProviderAdapter } from "#/infrastructure/adapters/github-cli-provider.adapter";
import { GitHubCliReleaseAdapter } from "#/infrastructure/adapters/github-cli-release.adapter";
import { ConfigResolverService } from "#/infrastructure/config/config-resolver.service";
import { ChangelogPostProcessor } from "#/infrastructure/services/changelog-postprocessor.service";
import { CliffTomlParserService } from "#/infrastructure/services/cliff-toml-parser.service";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class CreateReleaseTask implements Task {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "CreateReleaseTask";
    }

    getDescription(): string {
        return "Creates a new GitHub release based on the current context and version";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        if (this.context.getConfig().skipGitHubRelease || this.context.getConfig().skipGit) {
            logger.info("Skipping release creation as per configuration");
            return;
        }

        const githubCliProvider = GithubCliProviderAdapter.create();
        if (githubCliProvider.isErr()) {
            throw new TaskExecutionError("Failed to create GitHub CLI provider", githubCliProvider.error);
        }

        const templateContext = this.context.createTemplateContext();
        const configResolver = new ConfigResolverService();
        const config = this.context.getConfig();
        const cliffTomlParser = new CliffTomlParserService(
            new FileSystemService(join(this.context.getBasePath(), "cliff.toml")),
        );
        const changelogPostProcessor = new ChangelogPostProcessor(cliffTomlParser);

        const rawChangelog = this.context.getChangelogContent();
        if (!rawChangelog) {
            throw new TaskExecutionError("No changelog content available to create release");
        }

        const content = await changelogPostProcessor.process(rawChangelog);
        if (content.isErr()) {
            throw new TaskExecutionError("Failed to process changelog content", content.error);
        }

        const githubCliRelease = new GitHubCliReleaseAdapter(githubCliProvider.value);

        const release = await githubCliRelease.createRelease({
            title: configResolver.resolveReleaseTitle(config.releaseTitle, templateContext),
            tag: configResolver.resolveTagName(config.tagName, templateContext),
            content: content.value,
            latest: config.releaseLatest,
            draft: config.releaseDraft,
            prerelease: config.releasePreRelease,
            dryRun: this.context.getConfig().dryRun,
        });

        if (release.isErr()) {
            throw new TaskExecutionError("Failed to create GitHub release", release.error);
        }

        logger.info("GitHub release created successfully");
    }

    async undo(): Promise<void> {
        logger.info("Undoing release creation is not supported. Please delete the release manually if needed.");
    }
}
