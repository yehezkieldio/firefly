import type { Command } from "#/core/command/command.types";
import type { WorkflowData } from "#/core/context/workflow.context";
import type { ServiceKey, ServiceKeys } from "#/core/service/service.registry";

/**
 * Factory function for creating commands with full type inference.
 *
 * Provides better IDE support and type checking when defining commands.
 * Uses `satisfies` pattern for optimal type inference.
 *
 * @template TConfig - Command configuration type
 * @template TData - Workflow data type
 * @template TServices - Tuple of required service keys
 * @param command - Command definition
 * @returns The same command (identity function for type inference)
 *
 * @example
 * ```typescript
 * const myCommand = createCommand({
 *   meta: {
 *     name: "my-command",
 *     description: "Does something useful",
 *     configSchema: z.object({ option: z.boolean() }),
 *     requiredServices: ["fs"] as const,
 *   },
 *   buildTasks: (ctx) => okAsync([]),
 * });
 * ```
 */
export function createCommand<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    const TServices extends ServiceKeys = readonly ServiceKey[],
>(command: Command<TConfig, TData, TServices>): Command<TConfig, TData, TServices> {
    return command;
}
