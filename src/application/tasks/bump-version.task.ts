import type { ApplicationContext } from "#/application/context";
import type { Task } from "#/application/task.interface";
import { Version } from "#/core/domain/version";
import { VersionRepositoryAdapter } from "#/infrastructure/adapters/version-repository.adapter";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";

export class BumpVersionTask implements Task {
    private readonly versionRepository: VersionRepositoryAdapter;
    private previousVersion?: string;

    constructor(private readonly context: ApplicationContext) {
        this.versionRepository = new VersionRepositoryAdapter(createPackageJsonService(context.getBasePath()));
    }

    getName(): string {
        return "BumpVersionTask";
    }

    getDescription(): string {
        return "Bumps the version in package.json based on the selected strategy";
    }

    isUndoable(): boolean {
        return true;
    }

    async execute(): Promise<void> {
        const nextVersion = this.context.getNextVersion();
        if (!nextVersion) {
            throw new TaskExecutionError("Next version must be determined before bumping version");
        }

        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            throw new TaskExecutionError("Current version must be set before bumping version");
        }

        this.previousVersion = currentVersion;

        if (this.context.getConfig().skipBump) {
            logger.info("Skipping version bump as per configuration");
            return;
        }

        logger.info(`Bumping version from ${currentVersion} to ${nextVersion}`);

        const version = Version.create(nextVersion);
        if (version.isErr()) {
            throw new TaskExecutionError(`Invalid version format: ${nextVersion}`);
        }

        const updateResult = await this.versionRepository.setVersion(version.value, this.context.getConfig().dryRun);
        if (updateResult.isErr()) {
            throw new TaskExecutionError(`Failed to update version: ${updateResult.error.message}`);
        }
    }

    async undo(): Promise<void> {
        if (!this.previousVersion) {
            logger.warn("No previous version to revert to");
            return;
        }

        logger.info(`Reverting to previous version: ${this.previousVersion}`);

        const version = Version.create(this.previousVersion);
        if (version.isErr()) {
            throw new TaskExecutionError(`Invalid previous version format: ${this.previousVersion}`);
        }

        const revertResult = await this.versionRepository.setVersion(version.value);
        if (revertResult.isErr()) {
            throw new TaskExecutionError(`Failed to revert version: ${revertResult.error.message}`);
        }

        logger.info(`Successfully reverted to version: ${this.previousVersion}`);
    }
}
