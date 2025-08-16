import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/core/contracts/workflow.interface";
import { type FireflyAsyncResult, type FireflyResult, fireflyOk, fireflyOkAsync } from "#/shared/utils/result.util";

class PreflightTask implements Task {
    readonly id = "preflight-check";
    readonly name = "Preflight Check";
    readonly description = "Performs preflight checks before creating release.";

    execute(_context: OrchestrationContext): FireflyAsyncResult<void> {
        console.log("PreflightTask: performing preflight checks...");
        return fireflyOkAsync();
    }

    validate(_context: OrchestrationContext): FireflyResult<void> {
        return fireflyOk(undefined);
    }

    canUndo(): boolean {
        return false;
    }

    undo(_context: OrchestrationContext): FireflyAsyncResult<void> {
        return fireflyOkAsync();
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

    isEnabled(_features: Set<string>): boolean {
        return true;
    }
}

export function createReleaseWorkflow(): Workflow {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Create a new release.",

        buildTasks(_context) {
            return fireflyOk([new PreflightTask()]);
        },
    };
}
