import z from "zod";
import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

/**
 * Task context type alias for cleaner signatures.
 */
export type TaskContext<TState extends Record<string, unknown> = Record<string, unknown>> =
    OrchestrationContext<TState>;

/**
 * Core task interface defining the structure and behavior of a task.
 */
export interface Task<TContext extends TaskContext = TaskContext> {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    execute(context: TContext): FireflyAsyncResult<void>;
    validate(context: TContext): FireflyResult<void>;

    canUndo(): boolean;
    undo(context: TContext): FireflyAsyncResult<void>;
    compensate?(context: TContext): FireflyAsyncResult<void>;

    getDependencies(): string[];
    getDependents(): string[];

    getRequiredFeatures(): string[];
    isEnabled(features: Set<string>): boolean;

    beforeExecute?(context: TContext): FireflyAsyncResult<void>;
    afterExecute?(context: TContext): FireflyAsyncResult<void>;
    onExecuteError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
    beforeRollback?(context: TContext): FireflyAsyncResult<void>;
    afterRollback?(context: TContext): FireflyAsyncResult<void>;
    onRollbackError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
}

/**
 * Task definition for declarative workflow configuration.
 */
export const TaskDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),

    dependencies: z.array(z.string().min(1)).optional(),
    requiredFeatures: z.array(z.string().min(1)).optional(),
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Task group for organizing related tasks.
 */
export const TaskGroupSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    tasks: z.array(TaskDefinitionSchema),
    parallel: z.boolean().default(false),
    continueOnError: z.boolean().default(false),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TaskGroup = z.infer<typeof TaskGroupSchema>;
