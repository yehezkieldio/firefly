import type { z } from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import type { WorkflowExecutionResult } from "#/execution/workflow-executor";
import type { ResolvedServices, ServiceKey, ServiceKeys, ServiceKeysFromArray } from "#/shared/interfaces";
import type { Task } from "#/task-system/task-types";
import type { FireflyAsyncResult } from "#/utils/result";

export interface CommandMetadata<TServices extends ServiceKeys = ServiceKeys> {
    readonly name: string;
    readonly description: string;
    readonly configSchema: z.ZodType;
    readonly requiredServices: TServices;
    readonly examples?: string[];
}

/**
 * Context type for a command with specific services.
 * This is the context type that tasks within the command will receive.
 */
export type CommandContext<
    TConfig,
    TData extends Record<string, unknown>,
    TServices extends ServiceKeys,
> = WorkflowContext<TConfig, TData, ResolvedServices<ServiceKeysFromArray<TServices>>>;

/**
 * A type-safe command definition with specific config, data, and service requirements.
 *
 * @template TConfig - The configuration schema type
 * @template TData - The workflow data type that accumulates during execution
 * @template TServices - Tuple of required service keys (e.g., readonly ['fs', 'git'])
 */
export interface Command<
    TConfig = unknown,
    TData extends Record<string, unknown> = Record<string, unknown>,
    TServices extends ServiceKeys = readonly ServiceKey[],
> {
    readonly meta: CommandMetadata<TServices>;
    buildTasks: (context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<Task[]>;
    beforeExecute?: (context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<void>;
    afterExecute?: (
        result: WorkflowExecutionResult,
        context: CommandContext<TConfig, TData, TServices>
    ) => FireflyAsyncResult<void>;
    onError?: (error: Error, context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<void>;
}

/**
 * Type-erased command interface for registry storage.
 * Uses `any` internally but is only accessed through type-safe methods.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for type erasure in registry
export type AnyCommand = Command<any, any, any>;

/**
 * Creates a type-safe command with explicit service requirements.
 *
 * @example
 * ```ts
 * const myCommand = createCommand({
 *     meta: {
 *         name: 'my-command',
 *         description: 'Does something',
 *         configSchema: MyConfigSchema,
 *         requiredServices: ['fs', 'git'] as const,
 *     },
 *     buildTasks(context) {
 *         // context.services only has { fs, git }
 *         return okAsync([...tasks]);
 *     },
 * });
 * ```
 */
export function createCommand<
    TConfig = unknown,
    TData extends Record<string, unknown> = Record<string, unknown>,
    const TServices extends ServiceKeys = readonly ServiceKey[],
>(command: Command<TConfig, TData, TServices>): Command<TConfig, TData, TServices> {
    return command;
}
