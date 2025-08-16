import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { ConfigResolverService } from "#/infrastructure/config/config-resolver.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class CreateCommitTask implements Task {
    private readonly gitProvider: GitProviderAdapter;
    private readonly configResolver: ConfigResolverService;

    constructor(private readonly context: ApplicationContext) {
        this.gitProvider = GitProviderAdapter.getInstance();
        this.configResolver = new ConfigResolverService();
    }

    getName(): string {
        return "CreateCommitTask";
    }

    getDescription(): string {
        return "Stages changes and creates a commit based on the current context and version";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        if (this.context.getConfig().skipCommit || this.context.getConfig().skipGit) {
            logger.info("Skipping commit creation as per configuration");
            return;
        }

        const modifiedFiles = await this.getModifiedFiles();
        if (modifiedFiles.length === 0) {
            logger.info("No relevant modified files found, skipping commit creation");
            return;
        }

        await this.stageFiles(modifiedFiles);
        const commitMessage = this.buildCommitMessage();
        await this.createCommit(commitMessage);

        logger.info("Commit created successfully");
    }

    async undo(): Promise<void> {
        logger.info("Undoing commit creation by resetting to previous state");

        const expectedMessage = this.buildCommitMessage();

        const lastCommitMessageResult = await this.gitProvider.exec(["log", "-1", "--pretty=%B"]);
        if (lastCommitMessageResult.isErr()) {
            throw new TaskExecutionError("Failed to retrieve last commit message", lastCommitMessageResult.error);
        }
        const lastCommitMessage = lastCommitMessageResult.value.trim();

        if (lastCommitMessage !== expectedMessage) {
            logger.warn("Undo skipped: Last commit does not match Firefly's commit message. No commit to undo.");
            return;
        }

        const resetResult = await this.gitProvider.resetLastCommit();
        if (resetResult.isErr()) {
            throw new TaskExecutionError("Failed to reset last commit", resetResult.error);
        }

        logger.info("Commit successfully undone");
    }

    private async getModifiedFiles(): Promise<string[]> {
        logger.verbose("CreateCommitTask: Retrieving modified files");

        const modifiedFilesResult = await this.gitProvider.getFilteredModifiedFiles(this.context.getConfig().dryRun);
        if (modifiedFilesResult.isErr()) {
            throw new TaskExecutionError("Failed to get modified files", modifiedFilesResult.error);
        }

        const modifiedFiles = modifiedFilesResult.value;
        logger.verbose(`CreateCommitTask: Found ${modifiedFiles.length} modified files:`, modifiedFiles.join(", "));

        return modifiedFiles;
    }

    private async stageFiles(files: string[]): Promise<void> {
        logger.verbose("CreateCommitTask: Starting file staging process");
        logger.info("Staging changes for files:", files.join(", "));

        for (const file of files) {
            logger.verbose(`CreateCommitTask: Staging file: ${file}`);

            const stageResult = await this.gitProvider.stageFile(file, this.context.getConfig().dryRun);

            if (stageResult.isErr()) {
                throw new TaskExecutionError(`Failed to stage file: ${file}`, stageResult.error);
            }

            logger.verbose(`CreateCommitTask: Successfully staged file: ${file}`);
        }

        logger.verbose("CreateCommitTask: All files staged successfully");
    }

    private buildCommitMessage(): string {
        logger.verbose("CreateCommitTask: Building commit message");

        const templateContext = this.context.createTemplateContext();
        const commitMessage = this.configResolver.resolveCommitMessage(
            this.context.getConfig().commitMessage,
            templateContext,
        );

        logger.verbose(`CreateCommitTask: Built commit message: "${commitMessage}"`);
        logger.info("Creating commit with message:", commitMessage);

        return commitMessage;
    }

    private async createCommit(message: string): Promise<void> {
        logger.verbose("CreateCommitTask: Creating commit");

        const commitResult = await this.gitProvider.createCommit(message, this.context.getConfig().dryRun);
        if (commitResult.isErr()) {
            logger.verbose("CreateCommitTask: Failed to create commit", commitResult.error);
            throw new TaskExecutionError("Failed to create commit", commitResult.error);
        }

        logger.verbose("CreateCommitTask: Commit created successfully");
    }
}
