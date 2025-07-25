import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { ConfigResolverService } from "#/infrastructure/config/config-resolver.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class CreateTagTask implements Task {
    private readonly gitProvider: GitProviderAdapter;
    private readonly configResolver: ConfigResolverService;
    private createdTag?: string;

    constructor(private readonly context: ApplicationContext) {
        this.gitProvider = GitProviderAdapter.getInstance();
        this.configResolver = new ConfigResolverService();
    }

    getName(): string {
        return "CreateTagTask";
    }

    getDescription(): string {
        return "Creates a tag based on the current context and version";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        if (this.context.getConfig().skipTag || this.context.getConfig().skipGit) {
            logger.info("Skipping tag creation as per configuration");
            return;
        }

        const tagName = this.buildTagName();
        // const tagMessage = this.buildTagMessage();

        await this.createTag(tagName);
        this.createdTag = tagName;

        logger.info(`Tag '${tagName}' created successfully`);
    }

    async undo(): Promise<void> {
        logger.verbose("CreateTagTask: Starting undo process");

        if (!this.createdTag) {
            logger.info("No tag to undo");
            return;
        }

        logger.info(`Undoing tag creation by deleting tag: ${this.createdTag}`);

        const deleteResult = await this.gitProvider.deleteLocalTag(this.createdTag);
        if (deleteResult.isErr()) {
            throw new TaskExecutionError(`Failed to delete tag: ${this.createdTag}`, deleteResult.error);
        }

        logger.info(`Tag '${this.createdTag}' successfully deleted`);
        this.createdTag = undefined;
    }

    private buildTagName(): string {
        logger.verbose("CreateTagTask: Building tag name");

        const templateContext = this.context.createTemplateContext();
        const config = this.context.getConfig();

        const tagName = this.configResolver.resolveTagName(config.tagName, templateContext);

        logger.verbose(`CreateTagTask: Built tag name: "${tagName}"`);
        return tagName;
    }

    // private buildTagMessage(): string | undefined {
    //     logger.verbose("CreateTagTask: Building tag message");

    //     const config = this.context.getConfig();

    //     if (!config.releaseNotes?.trim()) {
    //         logger.verbose("CreateTagTask: No release notes configured for tag message");
    //         return undefined;
    //     }

    //     const templateContext = this.context.createTemplateContext();
    //     const tagMessage = this.configResolver.resolveReleaseTitle(config.releaseNotes, templateContext);

    //     logger.verbose(`CreateTagTask: Built tag message: "${tagMessage}"`);
    //     return tagMessage;
    // }

    private async createTag(tagName: string, tagMessage?: string): Promise<void> {
        logger.verbose(`CreateTagTask: Creating tag: ${tagName}`);

        if (tagMessage) {
            logger.verbose(`CreateTagTask: Using tag message: "${tagMessage}"`);
            logger.info(`Creating tag '${tagName}' with message: "${tagMessage}"`);
        } else {
            logger.info(`Creating tag '${tagName}' without message`);
        }

        const createResult = await this.gitProvider.createTag(tagName, tagMessage, this.context.getConfig().dryRun);
        if (createResult.isErr()) {
            throw new TaskExecutionError(`Failed to create tag: ${tagName}`, createResult.error);
        }

        logger.verbose(`CreateTagTask: Tag created successfully: ${tagName}`);
    }
}
