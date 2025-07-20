import type { Command, CommandResult } from "#/application/command.interface";
import { CommandExecutionError, FireflyError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";

export class CommandExecutorService {
    async executeCommand(command: Command): Promise<CommandResult> {
        const commandName = command.getName();

        try {
            logger.debug(`Executing ${commandName}`);
            await command.execute();
            logger.debug(`${commandName} completed successfully`);

            return { success: true };
        } catch (error) {
            const fireflyError = this.normalizeError(error, commandName);

            return {
                success: false,
                error: fireflyError,
            };
        }
    }

    async undoCommand(command: Command): Promise<CommandResult> {
        const commandName = command.getName();

        try {
            logger.verbose(`Rolling back: ${commandName}`);
            await command.undo();

            return { success: true };
        } catch (error) {
            const fireflyError = this.normalizeError(error, `${commandName} rollback`);
            logger.error(`${commandName} rollback failed: ${fireflyError.message}`);

            return {
                success: false,
                error: fireflyError,
            };
        }
    }

    private normalizeError(error: unknown, context: string): FireflyError {
        if (error instanceof FireflyError) {
            return error;
        }

        if (error instanceof Error) {
            return new CommandExecutionError(`${context} failed: ${error.message}`, error);
        }

        return new CommandExecutionError(`${context} failed: ${String(error)}`);
    }
}
