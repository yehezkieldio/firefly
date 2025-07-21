import { join } from "node:path";
import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { CommandExecutionError } from "#/shared/utils/error";

export class PreflightCheckCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "PreflightCheckCommand";
    }

    getDescription(): string {
        return "Validates git repository and configuration files";
    }

    async execute(): Promise<void> {
        await this.checkValidGitRepository();
        await this.checkGitCliffConfig();
    }

    async undo(): Promise<void> {}

    private async checkGitCliffConfig(): Promise<void> {
        const fileService = new FileSystemService(join(this.context.getBasePath(), "cliff.toml"));

        const existsResult = await fileService.exists();
        if (existsResult.isErr()) {
            throw new CommandExecutionError("Failed to check git-cliff configuration", existsResult.error);
        }

        if (!existsResult.value) {
            throw new CommandExecutionError("Could not find git-cliff configuration file at cliff.toml.");
        }
    }

    private async checkValidGitRepository(): Promise<void> {
        const gitProvider = new GitProviderAdapter();
        const result = await gitProvider.isInsideGitRepository();

        if (result.isErr()) {
            throw new CommandExecutionError("Failed to check if inside a git repository", result.error);
        }

        if (!result.value) {
            throw new CommandExecutionError(
                "You are not inside a git repository. Please run this command inside a git repository."
            );
        }
    }
}
