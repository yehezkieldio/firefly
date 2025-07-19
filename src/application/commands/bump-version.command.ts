import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";

export class BumpVersionCommand implements ICommand {
    constructor(private readonly context: ApplicationContext) {}

    async execute() {
        this.context.getBasePath();
        return ok(undefined);
    }

    async undo() {
        return ok(undefined);
    }

    getName(): string {
        return "BumpVersionCommand";
    }

    getDescription(): string {
        return "Determines the next version based on the provided configuration";
    }
}
