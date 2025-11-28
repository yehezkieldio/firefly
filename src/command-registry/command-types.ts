import type { z } from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import type { WorkflowExecutionResult } from "#/execution/workflow-executor";
import type { Task } from "#/task-system/task-types";
import type { FireflyAsyncResult } from "#/utils/result";

export interface CommandMetadata {
    readonly name: string;
    readonly description: string;
    readonly configSchema: z.ZodType;
    readonly examples?: string[];
}

/**
 * A type-safe command definition with specific config and data types.
 */
export interface Command<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    readonly meta: CommandMetadata;
    buildTasks: (context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<Task[]>;
    beforeExecute?: (context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<void>;
    afterExecute?: (r: WorkflowExecutionResult, c: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<void>;
    onError?: (error: Error, context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<void>;
}

/**
 * Type-erased command interface for registry storage.
 * Uses `any` internally but is only accessed through type-safe methods.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for type erasure in registry
export type AnyCommand = Command<any, any>;

export function createCommand<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
    command: Command<TConfig, TData>
): Command<TConfig, TData> {
    return command;
}
