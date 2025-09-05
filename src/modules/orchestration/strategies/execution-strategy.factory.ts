import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import type { OrchestratorOptions } from "#/modules/orchestration/contracts/orchestration.interface";
import { SequentialExecutionStrategy } from "#/modules/orchestration/strategies/sequential-execution.strategy";

export function createExecutionStrategy(options: OrchestratorOptions): IExecutionStrategy {
    return new SequentialExecutionStrategy(options);
}
