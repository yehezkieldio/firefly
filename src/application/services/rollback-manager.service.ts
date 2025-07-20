import type { Command } from "#/application/command.interface";
import type { CommandExecutorService } from "#/application/services/command-executor.service";
import { logger } from "#/shared/utils/logger";

export class RollbackManager {
    private readonly commands: Command[] = [];

    addCommand(command: Command): void {
        if (!command) {
            logger.warn("Invalid command provided to rollback manager");
            return;
        }

        this.commands.push(command);
    }

    async executeRollback(commandExecutor: CommandExecutorService): Promise<boolean> {
        if (!this.hasCommands()) {
            return true;
        }

        logger.warn("Initiating rollback of failed operations...");

        // Execute rollbacks in reverse order
        const reversedCommands = this.commands.slice().reverse();

        for (const command of reversedCommands) {
            // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required for rollbacks
            const result = await commandExecutor.undoCommand(command);

            if (!result.success) {
                logger.error(`Rollback failed for ${command.getName()}: ${result.error?.message}`);
                return false;
            }
        }

        return true;
    }

    clear(): void {
        this.commands.length = 0;
    }

    getCommandCount(): number {
        return this.commands.length;
    }

    hasCommands(): boolean {
        return this.commands.length > 0;
    }
}
