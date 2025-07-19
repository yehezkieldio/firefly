import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";

export class DetermineVersionCommand implements ICommand {
    constructor(private readonly context: ApplicationContext) {}

    async execute() {
        this.context.getBasePath();
        return ok(undefined);
    }

    async undo() {
        return ok(undefined);
    }

    getName(): string {
        return "DetermineVersionCommand";
    }

    getDescription(): string {
        return "Determines the next version by analyzing conventional commits or prompting for manual version selection";
    }
}
