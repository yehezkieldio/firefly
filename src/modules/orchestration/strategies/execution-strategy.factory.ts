import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import type { OrchestratorOptions } from "#/modules/orchestration/contracts/orchestration.interface";
import { SequentialExecutionStrategy } from "#/modules/orchestration/strategies/sequential-execution.strategy";

export function createExecutionStrategy(options: OrchestratorOptions): IExecutionStrategy {
    // TODO: Migrate to DAG based execution strategy because sequential is too limiting, and we using conditional tasks.
    // For now, we can just use sequential as it works for our current workflows.
    // Once we have the project is more stable, we can consider implementing a DAG based execution strategy.

    return new SequentialExecutionStrategy(options);
}
