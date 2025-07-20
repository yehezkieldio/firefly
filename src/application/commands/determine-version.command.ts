import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class DetermineVersionCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "DetermineVersionCommand";
    }

    getDescription(): string {
        return "Determines the next version to release";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - restore previous version state
    }
}
