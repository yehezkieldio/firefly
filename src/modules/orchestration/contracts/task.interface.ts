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
    readonly name: string;
    readonly description: string;
    execute(context: TContext): FireflyAsyncResult<void>;
    validate?(context: TContext): FireflyResult<void>;
    canUndo?(): boolean;
    undo?(context: TContext): FireflyAsyncResult<void>;
    compensate?(context: TContext): FireflyAsyncResult<void>;
    getDependencies?(): string[];
    getDependents?(): string[];
    getRequiredFeatures?(): string[];
    isEnabled?(features: Set<string>): boolean;
    beforeExecute?(context: TContext): FireflyAsyncResult<void>;
    afterExecute?(context: TContext): FireflyAsyncResult<void>;
    onExecuteError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
    beforeRollback?(context: TContext): FireflyAsyncResult<void>;
    afterRollback?(context: TContext): FireflyAsyncResult<void>;
    onRollbackError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
}

export interface ConditionalTask extends Task {
    shouldExecute(context?: OrchestrationContext): FireflyResult<boolean>;
    getNextTasks?(context?: OrchestrationContext): FireflyResult<string[]>;
}

export function isConditionalTask(task: Task): task is ConditionalTask {
    return "shouldExecute" in task && typeof task.shouldExecute === "function";
}
