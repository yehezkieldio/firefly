import type { FireflyResult } from "#/shared/result";

export interface ICommand {
    /**
     * Execute the command
     */
    execute(): Promise<FireflyResult<void>>;

    /**
     * Undo the command (rollback)
     */
    undo(): Promise<FireflyResult<void>>;

    /**
     * Get the command name for logging
     */
    getName(): string;

    /**
     * Get a description of what this command does
     */
    getDescription(): string;
}
