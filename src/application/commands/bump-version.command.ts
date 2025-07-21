import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { Version } from "#/core/domain/version";
import { VersionRepositoryAdapter } from "#/infrastructure/adapters/version-repository.adapter";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { CommandExecutionError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";

export class BumpVersionCommand implements Command {
    private readonly versionRepository: VersionRepositoryAdapter;
    private previousVersion?: string;

    constructor(private readonly context: ApplicationContext) {
        this.versionRepository = new VersionRepositoryAdapter(createPackageJsonService(context.getBasePath()));
    }

    getName(): string {
        return "BumpVersionCommand";
    }

    getDescription(): string {
        return "Updates version in package.json and related files";
    }

    async execute(): Promise<void> {
        const nextVersion = this.context.getNextVersion();
        if (!nextVersion) {
            throw new CommandExecutionError("Next version must be determined before bumping version");
        }

        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            throw new CommandExecutionError("Current version must be set before bumping version");
        }

        // Store previous version for rollback
        this.previousVersion = currentVersion;

        logger.info(`Bumping version from ${currentVersion} to ${nextVersion}`);

        try {
            const version = new Version(nextVersion);
            const result = await this.versionRepository.setVersion(version);

            if (result.isErr()) {
                throw new CommandExecutionError(
                    `Failed to update version to ${nextVersion}: ${result.error.message}`,
                    result.error
                );
            }

            this.context.setCurrentVersion(nextVersion);
        } catch (error) {
            throw new CommandExecutionError(`Failed to bump version to ${nextVersion}`, error as Error);
        }
    }

    async undo(): Promise<void> {
        if (!this.previousVersion) {
            logger.info("No previous version to restore");
            return;
        }

        try {
            const version = new Version(this.previousVersion);
            const result = await this.versionRepository.setVersion(version);

            if (result.isErr()) {
                throw new CommandExecutionError(
                    `Failed to restore version to ${this.previousVersion}: ${result.error.message}`,
                    result.error
                );
            }

            this.context.setCurrentVersion(this.previousVersion);
        } catch (error) {
            throw new CommandExecutionError(`Failed to restore version to ${this.previousVersion}`, error as Error);
        }
    }
}
