import type { ReleaseContextData } from "#/modules/orchestration/core/contracts/context-data.schema";
import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import { logger } from "#/shared/logger";
import { type FireflyAsyncResult, type FireflyResult, fireflyOk, fireflyOkAsync } from "#/shared/utils/result.util";

export class ReleasePreflightTask implements Task {
    readonly id = "release-preflight";
    readonly name = "Release Preflight Check";
    readonly description = "Validates the project state before initiating a release.";

    execute(context: OrchestrationContext<ReleaseContextData, "release">): FireflyAsyncResult<void> {
        return this.runChecks(context);
    }

    validate(): FireflyResult<void> {
        return fireflyOk();
    }

    canUndo(): boolean {
        return false;
    }

    undo(): FireflyAsyncResult<void> {
        return fireflyOkAsync(undefined);
    }

    getDependencies(): string[] {
        return [];
    }

    getDependents(): string[] {
        return [];
    }

    getRequiredFeatures(): string[] {
        return [];
    }

    isEnabled(): boolean {
        return true;
    }

    private runChecks(_context: OrchestrationContext<ReleaseContextData, "release">): FireflyAsyncResult<void> {
        logger.info("Running release preflight checks...");
        return fireflyOkAsync();
    }
}
