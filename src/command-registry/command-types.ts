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

export type CommandContext<
    TConfig,
    TData extends Record<string, unknown>,
    TServices extends ServiceKeys,
> = WorkflowContext<TConfig, TData, ResolvedServices<ServiceKeysFromArray<TServices>>>;

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

// biome-ignore lint/suspicious/noExplicitAny: Required for type erasure in registry
export type AnyCommand = Command<any, any, any>;

export function createCommand<
    TConfig = unknown,
    TData extends Record<string, unknown> = Record<string, unknown>,
    const TServices extends ServiceKeys = readonly ServiceKey[],
>(command: Command<TConfig, TData, TServices>): Command<TConfig, TData, TServices> {
    return command;
}
