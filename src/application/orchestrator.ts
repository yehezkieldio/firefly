import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";
import { RollbackManager } from "#/application/services/rollback-manager.service";
import { logger } from "#/shared/logger";

export class Orchestrator {
    private readonly rollbackManager: RollbackManager;

    constructor(
        context: ApplicationContext,
        private readonly steps: ICommand[]
    ) {
        this.rollbackManager = new RollbackManager(context);
    }

    async run(): Promise<void> {
        let executedSteps = 0;

        try {
            for (const step of this.steps) {
                logger.debug(`${step.getName()}: ${step.getDescription()}`);

                // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required
                const result = await step.execute();

                if (result.isErr()) {
                    logger.error(`${step.getName()} failed:`, result.error.message);
                    await this.handleFailure(executedSteps);
                    return;
                }

                this.rollbackManager.addOperation(() => step.undo(), `Rollback: ${step.getName()}`);

                executedSteps++;
                logger.debug(`${step.getName()} completed successfully`);
            }

            logger.debug(` All ${this.steps.length} steps completed successfully!`);
        } catch (error) {
            logger.error(error instanceof Error ? error.message : error);
            await this.handleFailure(executedSteps);
        }
    }

    private async handleFailure(executedSteps: number): Promise<void> {
        if (this.rollbackManager.hasOperations()) {
            logger.warn(`Rolling back ${executedSteps} executed step(s)...`);
            const rollbackResult = await this.rollbackManager.executeRollback();

            if (rollbackResult.isErr()) {
                logger.error("Rollback failed:", rollbackResult.error.message);
            } else {
                logger.info("Rollback completed successfully");
            }
        }
    }

    getRollbackManager(): RollbackManager {
        return this.rollbackManager;
    }

    clearRollbacks(): void {
        this.rollbackManager.clear();
    }
}
