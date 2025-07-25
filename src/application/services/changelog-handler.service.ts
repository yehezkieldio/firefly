import { err, ok } from "neverthrow";
import type { ApplicationContext } from "#/application/context";
import type { GitCliffAdapter } from "#/infrastructure/adapters/git-cliff.adapter";
import type { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { ConfigResolverService } from "#/infrastructure/config/config-resolver.service";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export interface ChangelogHandlerOptions {
    dryRun?: boolean;
    releaseNotes?: string;
    changelogPath?: string;
    includePath?: string;
    tagName?: string;
    hasRootDirection?: boolean;
    rootDirection?: string;
    repository?: string;
}

export class ChangelogHandlerService {
    private readonly configResolver: ConfigResolverService;

    constructor(
        private readonly gitCliffAdapter: GitCliffAdapter,
        private readonly gitProvider: GitProviderAdapter
    ) {
        this.configResolver = new ConfigResolverService();
    }

    async generateChangelog(context: ApplicationContext): Promise<AsyncFireflyResult<string>> {
        if (!context) {
            return err(new ConfigurationError("ApplicationContext is required"));
        }

        const nextVersion = context.getNextVersion();
        if (!nextVersion) {
            return err(new ConfigurationError("Next version must be set in context before generating changelog"));
        }

        logger.verbose("ChangelogHandlerService: Next version resolved for changelog generation.");
        const config = context.getConfig();
        const repositoryResult = await this.resolveRepository(config.repository);
        if (repositoryResult.isErr()) {
            return err(repositoryResult.error);
        }

        logger.verbose(`ChangelogHandlerService: Repository resolved: ${repositoryResult.value}`);
        const templateContext = context.createTemplateContext();
        const tagName = this.configResolver.resolveTagName(config.tagName, templateContext);
        logger.verbose(`ChangelogHandlerService: Tag name resolved: ${tagName}`);

        const options = await this.buildChangelogOptions(config, tagName, repositoryResult.value);
        if (options.isErr()) {
            return err(options.error);
        }
        logger.verbose("ChangelogHandlerService: Changelog options built.");

        const generateResult = await this.gitCliffAdapter.generate(options.value);
        if (generateResult.isErr()) {
            logger.error("ChangelogHandlerService: Failed to generate changelog", generateResult.error);
            return err(generateResult.error);
        }

        logger.verbose("ChangelogHandlerService: Changelog generated successfully.");
        return ok(generateResult.value);
    }

    private async resolveRepository(configRepository?: string): Promise<AsyncFireflyResult<string>> {
        // First check if user defined a repository in config
        if (configRepository?.trim() && configRepository !== "") {
            logger.verbose(`ChangelogHandlerService: Using repository from config: ${configRepository}`);
            return ok(configRepository);
        }

        // If not, get from git provider
        const urlResult = await this.gitProvider.getRepositoryUrl();
        if (urlResult.isErr()) {
            return err(new ConfigurationError("Repository URL is not configured and cannot be auto-detected"));
        }

        logger.verbose(`ChangelogHandlerService: Repository URL retrieved from git provider: ${urlResult.value}`);
        const extractResult = this.gitProvider.extractRepository(urlResult.value);
        if (extractResult.isErr()) {
            return err(new ConfigurationError("Repository URL is not valid", extractResult.error));
        }

        const { owner, repository } = extractResult.value;
        logger.verbose(`ChangelogHandlerService: Extracted repository owner: ${owner}, name: ${repository}`);
        return ok(`${owner}/${repository}`);
    }

    private async buildChangelogOptions(
        config: ReturnType<ApplicationContext["getConfig"]>,
        tagName: string,
        repository: string
    ): Promise<FireflyResult<ChangelogHandlerOptions>> {
        const options: ChangelogHandlerOptions = {
            dryRun: config.dryRun,
            changelogPath: config.changelogPath || "CHANGELOG.md",
            tagName,
            repository,
        };

        if (config.changelogPath) {
            options.changelogPath = config.changelogPath;
            logger.verbose(`ChangelogHandlerService: Changelog path set to ${config.changelogPath}`);
        }

        if (config.releaseNotes?.trim()) {
            options.releaseNotes = config.releaseNotes.replace(/\\n/g, "\n");
            logger.verbose("ChangelogHandlerService: Release notes added to changelog options.");
        }

        const gitRootDirectionResult = await this.gitProvider.getRootDirection();
        if (gitRootDirectionResult.isErr()) {
            return err(new ConfigurationError("Failed to get git root directory", gitRootDirectionResult.error));
        }

        if (gitRootDirectionResult.value && gitRootDirectionResult.value !== ".") {
            options.hasRootDirection = true;
            options.rootDirection = gitRootDirectionResult.value;
            options.includePath = `${config.base}/*`;
            logger.verbose(`ChangelogHandlerService: Include path set to ${options.includePath}`);
        }

        logger.verbose("ChangelogHandlerService: ChangelogHandlerOptions constructed.");
        return ok(options);
    }
}
