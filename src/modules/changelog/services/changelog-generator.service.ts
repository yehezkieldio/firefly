import { err, ok } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { GitCliffAdapter } from "#/modules/changelog/git-cliff.adapter";
import type {
    ReleaseTemplateResolverService,
    ResolvedTemplates,
} from "#/modules/configuration/services/release-template-resolver.service";
import { GitProvider } from "#/modules/git/git.provider";
import { GitHubProvider } from "#/modules/github/github.provider";
import { logger } from "#/shared/logger";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export interface ChangelogGeneratorOptions {
    dryRun?: boolean;
    releaseNotes?: string;
    changelogPath?: string;
    includePath?: string;
    tagName?: string;
    hasRootDirection?: boolean;
    rootDirection?: string;
    repository?: string;
}

export class ChangelogGeneratorService {
    private readonly templateResolver: ResolvedTemplates;
    private readonly gitCliffAdapter: GitCliffAdapter;
    private readonly gitProvider: GitProvider;

    constructor(templateResolver: ResolvedTemplates) {
        this.templateResolver = templateResolver;
        this.gitCliffAdapter = new GitCliffAdapter();
        this.gitProvider = GitProvider.getInstance();
    }

    async generateChangelog(config: ReturnType<ReleaseTaskContext["getConfig"]>): Promise<FireflyResult<string>> {
        logger.verbose("ChangelogHandlerService: Next version resolved for changelog generation.");
        const repositoryResult = await this.resolveRepository(config.repository);
        if (repositoryResult.isErr()) {
            return err(repositoryResult.error);
        }

        logger.verbose(`ChangelogHandlerService: Repository resolved: ${repositoryResult.value}`);
        const tagName = this.templateResolver.tagName(config.tagName || "");
        logger.verbose(`ChangelogHandlerService: Tag name resolved: ${tagName}`);

        const changelogOptionsResult = await this.buildChangelogOptions(config, tagName, repositoryResult.value);
        if (changelogOptionsResult.isErr()) {
            return err(changelogOptionsResult.error);
        }

        const generateResult = await this.gitCliffAdapter.generate(changelogOptionsResult.value);
        if (generateResult.isErr()) {
            logger.error("ChangelogHandlerService: Failed to generate changelog", generateResult.error);
            return err(generateResult.error);
        }

        logger.verbose("ChangelogHandlerService: Changelog generated successfully.");
        return ok(generateResult.value);
    }

    private async resolveRepository(configRepository?: string): Promise<FireflyResult<string>> {
        // First check if user defined a repository in config
        if (configRepository?.trim() && configRepository !== "") {
            logger.verbose(`ChangelogGeneratorService: Using repository from config: ${configRepository}`);
            return ok(configRepository);
        }

        // If not, get from git provider
        const urlResult = await this.gitProvider.repository.getRepositoryUrl();
        if (urlResult.isErr()) {
            return err(urlResult.error);
        }

        logger.verbose(`ChangelogGeneratorService: Repository URL retrieved from git provider: ${urlResult.value}`);
        const extractResult = this.gitProvider.repositoryParse.extractRepository(urlResult.value);
        if (extractResult.isErr()) {
            return err(extractResult.error);
        }

        const { owner, repo } = extractResult.value;
        logger.verbose(`ChangelogGeneratorService: Extracted repository owner: ${owner}, name: ${repo}`);
        return ok(`${owner}/${repo}`);
    }

    private async buildChangelogOptions(
        config: ReturnType<ReleaseTaskContext["getConfig"]>,
        tagName: string,
        repository: string,
    ): Promise<FireflyResult<ChangelogGeneratorOptions>> {
        const options: ChangelogGeneratorOptions = {
            dryRun: config.dryRun,
            changelogPath: config.changelogPath || "CHANGELOG.md",
            tagName,
            repository,
        };

        if (config.changelogPath) {
            options.changelogPath = config.changelogPath;
            logger.verbose(`ChangelogGeneratorService: Changelog path set to ${config.changelogPath}`);
        }

        if (config.releaseNotes?.trim()) {
            options.releaseNotes = config.releaseNotes.replace(/\\n/g, "\n");
            logger.verbose("ChangelogGeneratorService: Release notes added to changelog options.");
        }

        const gitRootDirectionResult = await this.gitProvider.repository.getGitDirectory();
        if (gitRootDirectionResult.isErr()) {
            return err(gitRootDirectionResult.error);
        }

        if (gitRootDirectionResult.value && gitRootDirectionResult.value !== ".") {
            options.hasRootDirection = true;
            options.rootDirection = gitRootDirectionResult.value;
            options.includePath = `${config.base}/*`;
            logger.verbose(`ChangelogGeneratorService: Include path set to ${options.includePath}`);
        }

        logger.verbose("ChangelogGeneratorService: Changelog options built successfully.");
        return ok(options);
    }
}
