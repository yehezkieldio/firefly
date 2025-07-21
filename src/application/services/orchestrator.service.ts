import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { CommandExecutorService } from "#/application/services/command-executor.service";
import { RollbackManager } from "#/application/services/rollback-manager.service";
import { logger } from "#/shared/utils/logger";

export class OrchestratorService {
    private static readonly PREFLIGHT_COMMAND_NAME = "PreflightCheckCommand";

    private readonly rollbackManager: RollbackManager;
    private readonly commandExecutor: CommandExecutorService;

    constructor(
        _context: ApplicationContext,
        private readonly commands: Command[]
    ) {
        this.rollbackManager = new RollbackManager();
        this.commandExecutor = new CommandExecutorService();
    }

    async run(): Promise<void> {
        let executedSteps = 0;

        for (const command of this.commands) {
            // Register rollback operation before execution (except for preflight)
            if (!this.shouldSkipRollbackRegistration(command)) {
                this.rollbackManager.addCommand(command);
            }

            // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required for commands
            const result = await this.commandExecutor.executeCommand(command);

            if (!result.success) {
                await this.handleFailure(executedSteps, result.error ?? new Error("Unknown error"));
                return;
            }

            executedSteps++;
        }

        logger.debug(`All ${this.commands.length} commands completed successfully!`);
    }

    private shouldSkipRollbackRegistration(command: Command): boolean {
        return command.getName() === OrchestratorService.PREFLIGHT_COMMAND_NAME;
    }

    private async handleFailure(executedSteps: number, error: Error): Promise<void> {
        logger.error(error.message);

        if (!this.rollbackManager.hasCommands()) {
            return;
        }

        logger.warn(`Rolling back ${executedSteps} executed step(s)...`);
        const rollbackSuccess = await this.rollbackManager.executeRollback(this.commandExecutor);

        if (rollbackSuccess) {
            logger.info("Rollback completed successfully");
        } else {
            logger.error("Rollback failed - manual intervention may be required");
        }
    }

    getRollbackManager(): RollbackManager {
        return this.rollbackManager;
    }

    clearRollbacks(): void {
        this.rollbackManager.clear();
    }
}
