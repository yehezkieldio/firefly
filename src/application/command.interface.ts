import type { FireflyError } from "#/shared/utils/error";

export interface Command {
    execute(): Promise<void>;
    undo(): Promise<void>;
    getName(): string;
    getDescription(): string;
}

export interface CommandResult {
    success: boolean;
    error?: FireflyError;
}
