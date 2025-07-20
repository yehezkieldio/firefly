import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { BumpStrategyService } from "#/application/services/bump-strategy.service";
import { CommandExecutionError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";

export class DetermineVersionCommand implements Command {
    private readonly bumpStrategyService: BumpStrategyService;

    constructor(private readonly context: ApplicationContext) {
        this.bumpStrategyService = new BumpStrategyService(context);
    }

    getName(): string {
        return "DetermineVersionCommand";
    }

    getDescription(): string {
        return "Determines the next version to release based on the configured strategy";
    }

    async execute(): Promise<void> {
        const result = await this.bumpStrategyService.determineAndExecuteStrategy();
        if (result.isErr()) {
            throw result.error;
        }

        const currentVersion = this.context.getCurrentVersion();
        const nextVersion = this.context.getNextVersion();

        if (!currentVersion) {
            throw new CommandExecutionError("Failed to load current version");
        }

        if (!nextVersion) {
            throw new CommandExecutionError("Failed to determine next version");
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
