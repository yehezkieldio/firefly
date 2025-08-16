import { join } from "node:path";
import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class PreflightCheckTask implements Task {
    constructor(private readonly context: ApplicationContext) {}

    getName(): string {
        return "PreflightCheckTask";
    }

    getDescription(): string {
        return "Runs preflight checks to ensure Firefly can start without issues.";
    }

    isUndoable(): boolean {
        return false;
    }

    async execute(): Promise<void> {
        await this.checkIsCleanWorkingDirectory();
        await this.checkIfHasLocalCommits();
        await this.checkGitCliffConfig();
        await this.enrichConfig();
    }

    async undo(): Promise<void> {}

    private async enrichConfig(): Promise<void> {
        logger.verbose("PreflightCheckTask: Enriching configuration...");
        const enrichResult = await this.context.withEnrichedConfig();

        if (enrichResult.isErr()) {
            throw new TaskExecutionError(enrichResult.error.message, enrichResult.error);
        }

        logger.verbose("PreflightCheckTask: Configuration enriched successfully.");
    }

    private async checkIsCleanWorkingDirectory(): Promise<void> {
        const gitProvider = GitProviderAdapter.getInstance();

        if (this.context.getConfig().ci) {
            logger.verbose("PreflightCheckTask: Skipping working directory check in CI environment.");
            return;
        }

        logger.verbose("PreflightCheckTask: Checking if working directory is clean...");
        const statusResult = await gitProvider.isWorkingDirClean();
        if (statusResult.isErr()) {
            throw new TaskExecutionError("Failed to check working directory status", statusResult.error);
        }

        if (!statusResult.value) {
            throw new TaskExecutionError("Working directory is not clean. Please commit or stash your changes.");
        }

        logger.verbose("PreflightCheckTask: Working directory is clean.");
    }

    private async checkIfHasLocalCommits(): Promise<void> {
        const gitProvider = GitProviderAdapter.getInstance();

        if (this.context.getConfig().ci) {
            logger.verbose("PreflightCheckTask: Skipping local commits check in CI environment.");
            return;
        }

        logger.verbose("PreflightCheckTask: Checking for unpushed local commits...");
        const commitsResult = await gitProvider.hasUnpushedCommits();
        if (commitsResult.isErr()) {
            throw new TaskExecutionError("Failed to retrieve local commits", commitsResult.error);
        }

        if (commitsResult.value) {
            throw new TaskExecutionError(
                "Unpushed local commits detected. Please push your commits before proceeding to avoid interfering with Firefly.",
            );
        }

        logger.verbose("PreflightCheckTask: No unpushed local commits found.");
    }

    private async checkGitCliffConfig(): Promise<void> {
        logger.verbose("PreflightCheckTask: Checking for git-cliff configuration file...");
        const fileService = new FileSystemService(join(this.context.getBasePath(), "cliff.toml"));

        const existsResult = await fileService.exists();
        if (existsResult.isErr()) {
            throw new TaskExecutionError("Failed to check git-cliff configuration", existsResult.error);
        }

        if (!existsResult.value) {
            throw new TaskExecutionError("Could not find git-cliff configuration file at cliff.toml.");
        }
        logger.verbose("PreflightCheckTask: git-cliff configuration file found.");
    }
}
