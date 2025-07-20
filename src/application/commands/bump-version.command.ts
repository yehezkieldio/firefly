import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class BumpVersionCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "BumpVersionCommand";
    }

    getDescription(): string {
        return "Updates version in package.json and related files";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - restore previous version
    }
}
