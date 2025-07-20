import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { RollbackManager } from "#/application/services/rollback-manager.service";
import { logger } from "#/shared/utils/logger";

export class OrchestratorService {
    private static readonly PREFLIGHT_COMMAND_NAME = "PreflightCheckCommand";

    private readonly rollbackManager: RollbackManager;

    constructor(
        context: ApplicationContext,
        private readonly commands: Command[]
    ) {
        this.rollbackManager = new RollbackManager(context);
    }

    async run(): Promise<void> {
        let executedSteps = 0;

        try {
            for (const step of this.commands) {
                logger.debug(`Executing ${step.getName()}`);

                if (!this.shouldSkipRollbackRegistration(step)) {
                    this.rollbackManager.addOperation(() => step.undo(), step.getName(), step.getDescription());
                }

                // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required for commands
                const result = await step.execute();

                if (result.isErr()) {
                    logger.error(`${step.getName()} failed:`, result.error.message);
                    await this.handleFailure(executedSteps);
                    return;
                }

                executedSteps++;
                logger.debug(`${step.getName()} completed successfully`);
            }

            logger.debug(`All ${this.commands.length} commands completed successfully!`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(errorMessage);
            await this.handleFailure(executedSteps);
        }
    }

    private shouldSkipRollbackRegistration(step: Command): boolean {
        return step.getName() === OrchestratorService.PREFLIGHT_COMMAND_NAME;
    }

    private async handleFailure(executedSteps: number): Promise<void> {
        if (!this.rollbackManager.hasOperations()) {
            return;
        }

        logger.warn(`Rolling back ${executedSteps} executed step(s)...`);
        const rollbackResult = await this.rollbackManager.executeRollback();

        if (rollbackResult.isErr()) {
            logger.error("Rollback failed:", rollbackResult.error.message);
        } else {
            logger.info("Rollback completed successfully");
        }
    }

    getRollbackManager(): RollbackManager {
        return this.rollbackManager;
    }

    clearRollbacks(): void {
        this.rollbackManager.clear();
    }
}
