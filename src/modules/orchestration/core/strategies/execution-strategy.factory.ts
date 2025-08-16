import type { IExecutionStrategy } from "#/modules/orchestration/core/contracts/execution-strategy.interface";
import type { OrchestratorOptions } from "#/modules/orchestration/core/contracts/orchestration.interface";
import { SequentialExecutionStrategy } from "#/modules/orchestration/core/strategies/sequential-execution.strategy";

/**
 * Create an execution strategy based on the configuration and workflow type.
 */
export function createExecutionStrategy(options: OrchestratorOptions): IExecutionStrategy {
    return new SequentialExecutionStrategy(options);
}
