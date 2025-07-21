import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class CreateReleaseCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "CreateReleaseCommand";
    }

    getDescription(): string {
        return "Creates a GitHub release";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - delete created release
    }
}
