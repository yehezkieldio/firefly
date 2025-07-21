import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class CreateCommitCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "CreateCommitCommand";
    }

    getDescription(): string {
        return "Creates a git commit with the version changes";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - reset commit if needed
    }
}
