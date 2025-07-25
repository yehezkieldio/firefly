import type { ApplicationContext } from "#/application/context";
import { BumpStrategyService } from "#/application/services/version-bump-strategy.service";
import type { Task } from "#/application/task.interface";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class DetermineNextVersionTask implements Task {
    private readonly bumpStrategyService: BumpStrategyService;

    constructor(private readonly context: ApplicationContext) {
        this.bumpStrategyService = new BumpStrategyService(context);
    }

    getName(): string {
        return "DetermineNextVersionTask";
    }

    getDescription(): string {
        return "Determines the next version to release based on the strategy";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        const result = await this.bumpStrategyService.determineAndExecuteStrategy();
        if (result.isErr()) {
            throw result.error;
        }

        const currentVersion = this.context.getCurrentVersion();
        const nextVersion = this.context.getNextVersion();

        if (!currentVersion) {
            throw new TaskExecutionError("Current version is not set.");
        }

        if (!nextVersion) {
            throw new TaskExecutionError(`No next version determined. Current version: ${currentVersion}`);
        }
    }

    async undo(): Promise<void> {
        const previousNextVersion = this.context.getNextVersion();
        if (previousNextVersion) {
            logger.info(`Clearing determined version: ${previousNextVersion}`);
            this.context.setNextVersion("");
        }
    }
}
