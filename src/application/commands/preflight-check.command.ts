import { join } from "node:path";
import { ok } from "neverthrow";
import type { ICommand } from "#/application/command";
import type { ApplicationContext } from "#/application/context";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { PreflightError } from "#/shared/error";

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
        const cliffPath = join(this.context.getBasePath(), "cliff.toml");
        const fileService = new FileSystemService(cliffPath);

        const exists = await fileService.exists();
        if (exists.isErr()) {
            throw new PreflightError("Failed to check git-cliff configuration", exists.error);
        }

        if (!exists.value) {
            throw new PreflightError("Could not find git-cliff configuration file at cliff.toml");
        }

        return ok(undefined);
    }

    private async checkValidGitRepository() {
        const git = new GitProviderAdapter();

        const result = await git.exec(["rev-parse", "--is-inside-work-tree"]);
        if (result.isErr()) {
            throw new PreflightError("Not a valid git repository", result.error);
        }

        if (result.value.trim() !== "true") {
            throw new PreflightError("Not a valid git repository");
        }

        return ok(undefined);
    }
}
