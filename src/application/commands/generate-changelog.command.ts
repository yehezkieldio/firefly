import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";

export class GenerateChangelogCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "GenerateChangelogCommand";
    }

    getDescription(): string {
        return "Generates changelog using git-cliff";
    }

    async execute(): Promise<void> {
        // Implementation here
        this.context.getBasePath();
    }

    async undo(): Promise<void> {
        // Implementation here - restore previous changelog
    }
}
