import type { ArtemisResult } from "#/shared/result.js";

export interface ICommand {
    /**
     * Execute the command
     */
    execute(): Promise<ArtemisResult<void>>;

    /**
     * Undo the command (rollback)
     */
    undo(): Promise<ArtemisResult<void>>;

    /**
     * Get the command name for logging
     */
    getName(): string;

    /**
     * Get a description of what this command does
     */
    getDescription(): string;
}
