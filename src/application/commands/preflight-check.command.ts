import { join } from "node:path";
import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { PreflightError } from "#/shared/error";

export class PreflightCheckCommand implements ICommand {
    constructor(private readonly context: ApplicationContext) {}

    async execute() {
        await this.checkGitCliffConfig();

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
        const cliffPath = join(this.context.getBasePath(), "cliff.toml");
        const fileService = new FileSystemService(cliffPath);

        const exists = await fileService.exists();
        if (exists.isOk()) {
            if (!exists.value) {
                throw new PreflightError("Could not find git-cliff configuration file at cliff.toml");
            }

            return ok(undefined);
        }

        throw new PreflightError("Failed to check git-cliff configuration", exists.error);
    }
}
