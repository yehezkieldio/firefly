import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import type { OrchestratorOptions } from "#/modules/orchestration/contracts/orchestration.interface";
import { SequentialExecutionStrategy } from "#/modules/orchestration/strategies/sequential-execution.strategy";

export function createExecutionStrategy(options: OrchestratorOptions): IExecutionStrategy {
    // TODO: Replace with a DAG-based execution strategy to better support conditional task execution.
    // Sequential execution is sufficient for current workflows, but limits flexibility and scalability.
    // Once the project stabilizes, revisit and implement the DAG approach for improved orchestration.

    return new SequentialExecutionStrategy(options);
}
