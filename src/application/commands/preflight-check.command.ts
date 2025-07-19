import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import { logger } from "#/shared/logger";

export class PreflightCheckCommand implements ICommand {
    async execute() {
        logger.info("Executing preflight checks...");

        return ok(undefined);
    }

    async undo() {
        return ok(undefined);
    }

    getName(): string {
        return "PreflightCheckCommand";
    }

    getDescription(): string {
        return "Performs preflight checks before executing commands.";
    }
}
