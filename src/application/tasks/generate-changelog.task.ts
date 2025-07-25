import { join } from "node:path";
import type { ApplicationContext } from "#/application/context";
import { ChangelogHandlerService } from "#/application/services/changelog-handler.service";
import type { Task } from "#/application/task.interface";
import { GitCliffAdapter } from "#/infrastructure/adapters/git-cliff.adapter";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class GenerateChangelogTask implements Task {
    private readonly gitProvider: GitProviderAdapter;

    constructor(private readonly context: ApplicationContext) {
        this.gitProvider = GitProviderAdapter.getInstance();
    }

    getName(): string {
        return "GenerateChangelogTask";
    }

    getDescription(): string {
        return "Generates the changelog based on the current context and version";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        if (this.context.getConfig().skipChangelog) {
            logger.info("Skipping changelog generation as per configuration");
            return;
        }

        const fs = new FileSystemService(join(this.context.getBasePath(), this.context.getConfig().changelogPath));
        const isChangelogFileExists = await fs.exists();
        if (isChangelogFileExists.isErr()) {
            throw new TaskExecutionError("Failed to check changelog file existence", isChangelogFileExists.error);
        }

        if (!isChangelogFileExists.value) {
            const createResult = await fs.write("");
            if (createResult.isErr()) {
                throw new TaskExecutionError("Failed to create changelog file", createResult.error);
            }
        }

        const changelogHandler = new ChangelogHandlerService(new GitCliffAdapter(), this.gitProvider);

        const result = await changelogHandler.generateChangelog(this.context);
        if (result.isErr()) {
            throw new TaskExecutionError("Failed to generate changelog", result.error);
        }

        const changelog = result.value;
        this.context.setChangelogContent(changelog);

        logger.info("Changelog generated successfully");
    }

    async undo(): Promise<void> {
        const previousChangelog = this.context.getChangelogContent();
        if (previousChangelog) {
            logger.info("Removing previously generated changelog content");
            this.context.setChangelogContent("");
        }

        const resetResult = await this.gitProvider.restoreFileToHead(this.context.getConfig().changelogPath);
        if (resetResult.isErr()) {
            logger.error("Failed to restore changelog file to HEAD", resetResult.error);
            throw new TaskExecutionError("Failed to restore changelog file", resetResult.error);
        }
    }
}
