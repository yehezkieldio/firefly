import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class PushChangesTask implements Task {
    private readonly gitProvider: GitProviderAdapter;

    constructor(private readonly context: ApplicationContext) {
        this.gitProvider = GitProviderAdapter.getInstance();
    }

    getName(): string {
        return "PushChangesTask";
    }

    getDescription(): string {
        return "Pushes changes to the remote repository";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        if (this.context.getConfig().skipPush || this.context.getConfig().skipGit) {
            logger.info("Skipping push as per configuration");
            return;
        }

        const pushResult = await this.gitProvider.pushChanges(this.context.getConfig().dryRun);
        if (pushResult.isErr()) {
            throw new TaskExecutionError("Failed to push changes", pushResult.error);
        }

        const pushTagsResult = await this.gitProvider.pushTags(this.context.getConfig().dryRun);
        if (pushTagsResult.isErr()) {
            throw new TaskExecutionError("Failed to push tags", pushTagsResult.error);
        }

        logger.info("Changes and tags pushed successfully");
    }

    async undo(): Promise<void> {
        logger.info("Undoing push changes is not supported. Please revert changes manually if needed.");
    }
}
