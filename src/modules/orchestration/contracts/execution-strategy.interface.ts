import type { OrchestrationContext } from "#/modules/orchestration/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/contracts/workflow.interface";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export interface IExecutionStrategy {
    execute(tasks: readonly Task[], context?: OrchestrationContext): FireflyAsyncResult<WorkflowResult>;
}
