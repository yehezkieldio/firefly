import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class PushChangesCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "PushChangesCommand";
    }

    getDescription(): string {
        return "Pushes commits and tags to remote repository";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - force push to revert if safe
    }
}
