import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Strategy interface for different task execution approaches.
 */
export interface IExecutionStrategy {
    /**
     * Execute tasks according to the strategy's implementation.
     */
    execute(tasks: readonly Task[], context?: OrchestrationContext): FireflyAsyncResult<WorkflowResult>;
}
