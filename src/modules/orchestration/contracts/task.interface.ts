import type { OrchestrationContext } from "#/modules/orchestration/contracts/orchestration.interface";
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
    readonly description: string;
    execute(context: TContext): FireflyAsyncResult<void>;
    validate?(context: TContext): FireflyResult<void>;
    canUndo?(): boolean;
    undo?(context: TContext): FireflyAsyncResult<void>;
    compensate?(context: TContext): FireflyAsyncResult<void>;
    // Tasks that need to be completed before this one can run
    getDependencies?(): string[];
    // Tasks that depend on this task
    getDependents?(): string[];
    getRequiredFeatures?(): string[];
    isEnabled?(features: Set<string>): boolean;
    isEntryPoint?(): boolean;
    beforeExecute?(context: TContext): FireflyAsyncResult<void>;
    afterExecute?(context: TContext): FireflyAsyncResult<void>;
    onExecuteError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
    beforeRollback?(context: TContext): FireflyAsyncResult<void>;
    afterRollback?(context: TContext): FireflyAsyncResult<void>;
    onRollbackError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
}

export interface ConditionalTask<TContext extends TaskContext = TaskContext> extends Task<TContext> {
    shouldExecute(context?: TContext): FireflyResult<boolean>;
    getNextTasks?(context?: TContext): FireflyResult<string[]>;
}

export function isConditionalTask(task: Task): task is ConditionalTask {
    return "shouldExecute" in task && typeof task.shouldExecute === "function";
}
