import { join } from "node:path";
import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { PreflightError } from "#/shared/error";
import { logger } from "#/shared/logger";

export class PreflightCheckCommand implements ICommand {
    constructor(private readonly context: ApplicationContext) {}

    async execute() {
        await this.checkGitCliffConfig();
        await this.checkValidGitRepository();

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

    private async checkGitCliffConfig() {
        const fileService = new FileSystemService(join(this.context.getBasePath(), "cliff.toml"));

        const exists = await fileService.exists();
        if (exists.isErr()) {
            throw new PreflightError("Failed to check git-cliff configuration", exists.error);
        }

        if (!exists.value) {
            throw new PreflightError("Could not find git-cliff configuration file at cliff.toml.");
        }

        logger.debug("Found a cliff.toml configuration file in the current directory");
        return ok(undefined);
    }

    private async checkValidGitRepository() {
        const result = await this.context.git.exec(["rev-parse", "--is-inside-work-tree"]);
        if (result.isErr()) {
            throw new PreflightError(
                "This is not supposed to happen, either you don't have git installed or internal command failure",
                result.error
            );
        }

        if (result.value.trim() !== "true") {
            throw new PreflightError(
                "Could not find a valid git repository in the current directory, are you sure you are in a git repository?"
            );
        }

        logger.debug("Found a valid git repository in the current directory");
        return ok(undefined);
    }
}
