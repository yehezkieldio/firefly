import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class CreateTagCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "CreateTagCommand";
    }

    getDescription(): string {
        return "Creates a git tag for the release";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - delete created tag
    }
}
