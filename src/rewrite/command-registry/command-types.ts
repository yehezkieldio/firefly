import type { z } from "zod";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { WorkflowExecutionResult } from "#/rewrite/execution/workflow-executor";
import type { Task } from "#/rewrite/task-system/task-types";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Command metadata for registration and CLI generation.
 */
export interface CommandMetadata {
    /**
     * Command name (used in CLI).
     */
    readonly name: string;

    /**
     * Command description.
     */
    readonly description: string;

    /**
     * Command configuration schema.
     * Used for validation and type inference.
     */
    readonly configSchema: z.ZodType;

    /**
     * Optional examples for help text.
     */
    readonly examples?: string[];
}

/**
 * Command plugin interface.
 * Commands are self-contained plugins that register themselves.
 */
export interface Command<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Command metadata.
     */
    readonly meta: CommandMetadata;

    /**
     * Build the list of tasks for this command.
     * Tasks are returned in execution order.
     */
    buildTasks: (context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<Task[]>;

    /**
     * Optional hook before workflow execution.
     */
    beforeExecute?: (context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<void>;

    /**
     * Optional hook after workflow execution.
     */
    afterExecute?: (
        result: WorkflowExecutionResult,
        context: WorkflowContext<TConfig, TData>,
    ) => FireflyAsyncResult<void>;

    /**
     * Optional error handler.
     */
    onError?: (error: Error, context: WorkflowContext<TConfig, TData>) => FireflyAsyncResult<void>;
}

/**
 * Helper to create a command with type inference.
 */
export function createCommand<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
    command: Command<TConfig, TData>,
): Command<TConfig, TData> {
    return command;
}
