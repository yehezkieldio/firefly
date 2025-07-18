import { consola } from "consola";
import type { ArtemisResult } from "#/shared/result.js";
import { ArtemisError, err, ok } from "#/shared/result.js";
import type { ICommand } from "./commands/command.interface.js";

export class ReleaseOrchestrator {
    private executedCommands: ICommand[] = [];
    private readonly dryRun: boolean;

    constructor(dryRun = false) {
        this.dryRun = dryRun;
    }

    async run(commands: ICommand[]): Promise<ArtemisResult<void>> {
        if (this.dryRun) {
            consola.info(
                "Running in dry-run mode. No actual changes will be made."
            );
        }

        try {
            // Execute commands sequentially (await in loop is intentional for proper error handling)
            for (const command of commands) {
                consola.info(`Executing command: ${command.getName()}`);
                consola.debug(`Description: ${command.getDescription()}`);

                if (this.dryRun) {
                    consola.info(
                        `[DRY RUN] Would execute: ${command.getName()}`
                    );
                    continue;
                }

                const result = await command.execute();

                if (result.isErr()) {
                    consola.error(
                        `Command failed: ${command.getName()}`,
                        result.error
                    );

                    // Rollback previously executed commands
                    await this.rollback();

                    return err(
                        new ArtemisError(
                            `Command ${command.getName()} failed: ${result.error.message}`,
                            "COMMAND_EXECUTION_FAILED",
                            result.error
                        )
                    );
                }

                this.executedCommands.push(command);
                consola.success(`Command completed: ${command.getName()}`);
            }

            consola.success("All commands executed successfully!");
            return ok(undefined);
        } catch (error) {
            consola.error("Unexpected error during command execution:", error);

            // Rollback previously executed commands
            await this.rollback();

            return err(
                new ArtemisError(
                    `Unexpected error during command execution: ${error instanceof Error ? error.message : String(error)}`,
                    "UNEXPECTED_ERROR",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private async rollback(): Promise<void> {
        if (this.executedCommands.length === 0) {
            consola.info("No commands to rollback.");
            return;
        }

        consola.warn("Rolling back previously executed commands...");

        // Rollback in reverse order
        const commandsToRollback = [...this.executedCommands].reverse();

        // Sequential rollback is required for proper cleanup
        for (const command of commandsToRollback) {
            try {
                consola.info(`Rolling back command: ${command.getName()}`);

                if (this.dryRun) {
                    consola.info(
                        `[DRY RUN] Would rollback: ${command.getName()}`
                    );
                    continue;
                }

                const result = await command.undo();

                if (result.isErr()) {
                    consola.error(
                        `Failed to rollback command: ${command.getName()}`,
                        result.error
                    );
                    // Continue with other rollbacks even if one fails
                } else {
                    consola.success(
                        `Rolled back command: ${command.getName()}`
                    );
                }
            } catch (error) {
                consola.error(
                    `Unexpected error during rollback of ${command.getName()}:`,
                    error
                );
                // Continue with other rollbacks even if one fails
            }
        }

        // Clear the executed commands list
        this.executedCommands = [];
        consola.info("Rollback completed.");
    }

    /**
     * Get the list of executed commands
     */
    getExecutedCommands(): readonly ICommand[] {
        return [...this.executedCommands];
    }

    /**
     * Clear the executed commands list (useful for testing)
     */
    reset(): void {
        this.executedCommands = [];
    }
}
