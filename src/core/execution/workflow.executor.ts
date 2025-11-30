import type { WorkflowContext } from "#/core/context/workflow.context";
import type { FireflyError } from "#/core/result/error.types";
import {
    FireflyErr,
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    timeoutErrAsync,
} from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

/**
 * Comprehensive result of a workflow execution.
 */
export interface WorkflowExecutionResult {
    /**
     * Whether all tasks completed successfully
     */
    readonly success: boolean;

    /**
     * IDs of tasks that executed (in order)
     */
    readonly executedTasks: string[];

    /**
     * IDs of tasks that were skipped
     */
    readonly skippedTasks: string[];

    /**
     * ID of the task that failed (if any)
     */
    readonly failedTask?: string;

    /**
     * Error details if execution failed
     */
    readonly error?: FireflyError;

    /**
     * Whether rollback was attempted and completed
     */
    readonly rollbackExecuted: boolean;

    /**
     * When execution started
     */
    readonly startTime: Date;

    /**
     * When execution ended
     */
    readonly endTime: Date;

    /**
     * Total execution time in milliseconds
     */
    readonly executionTimeMs: number;
}

/**
 * Configuration options for the workflow executor.
 */
export interface WorkflowExecutorOptions {
    /**
     * When true, tasks receive a dry-run flag and should
     * simulate operations without making actual changes.
     */
    readonly dryRun?: boolean;
    /**
     * When true, automatically calls undo() on executed tasks
     * (in reverse order) if any task fails.
     */
    readonly enableRollback?: boolean;
    /**
     * AbortSignal for cancellation support.
     * When aborted, the workflow will stop after the current task completes.
     */
    readonly signal?: AbortSignal;
    /**
     * Timeout in milliseconds for the entire workflow execution.
     * Creates an internal AbortSignal if signal is not provided.
     */
    readonly timeoutMs?: number;
}

// Generic context type for executor internals
type ExecutorContext = WorkflowContext<unknown, Record<string, unknown>, unknown>;

/**
 * Executes workflow tasks in sequence with error handling and rollback.
 *
 * The executor:
 * 1. Runs tasks sequentially, passing updated context between them
 * 2. Evaluates skip conditions before each task
 * 3. Tracks executed tasks for potential rollback
 * 4. On failure, optionally rolls back completed tasks in reverse order
 *
 * @example
 * ```typescript
 * const executor = new WorkflowExecutor({
 *   dryRun: false,
 *   enableRollback: true,
 * });
 *
 * const result = await executor.execute(orderedTasks, context);
 *
 * if (result.isOk() && result.value.success) {
 *   console.log(`Executed ${result.value.executedTasks.length} tasks`);
 * } else {
 *   console.error(`Failed at task: ${result.value.failedTask}`);
 * }
 * ```
 */
export class WorkflowExecutor {
    private readonly options: WorkflowExecutorOptions;
    private readonly executedTasks: Task[] = [];
    /** Resolved AbortSignal for cancellation */
    readonly #signal?: AbortSignal;

    get [Symbol.toStringTag](): string {
        return "WorkflowExecutor";
    }

    constructor(options: WorkflowExecutorOptions = {}) {
        this.options = options;
        // Use provided signal, create timeout signal, or undefined
        this.#signal = options.signal ?? (options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined);
    }

    /**
     * Executes a sequence of tasks with the given initial context.
     *
     * @param tasks - Ordered array of tasks to execute
     * @param initialContext - Starting workflow context
     * @returns Execution result with success/failure status and metadata
     */
    execute(tasks: Task[], initialContext: ExecutorContext): FireflyAsyncResult<WorkflowExecutionResult> {
        const startTime = new Date();
        const executedTaskIds: string[] = [];
        const skippedTaskIds: string[] = [];

        if (this.options.dryRun) {
            logger.warn("Workflow executing in DRY RUN mode - no actual changes will be made");
        }

        logger.verbose(`WorkflowExecutor: Starting execution of ${tasks.length} tasks`);

        return this.executeTasksSequentially(tasks, initialContext, executedTaskIds, skippedTaskIds)
            .andThen(() => this.buildExecutionSuccessResult(startTime, executedTaskIds, skippedTaskIds))
            .orElse((error) =>
                this.handleExecutionFailure({
                    error,
                    startTime,
                    executedTaskIds,
                    skippedTaskIds,
                    initialContext,
                })
            );
    }

    private buildExecutionSuccessResult(startTime: Date, executedTaskIds: string[], skippedTaskIds: string[]) {
        const endTime = new Date();
        const result: WorkflowExecutionResult = {
            success: true,
            executedTasks: executedTaskIds,
            skippedTasks: skippedTaskIds,
            rollbackExecuted: false,
            startTime,
            endTime,
            executionTimeMs: endTime.getTime() - startTime.getTime(),
        };

        logger.verbose("WorkflowExecutor: Execution completed successfully");
        logger.verbose(
            `  Executed: ${executedTaskIds.length}, Skipped: ${skippedTaskIds.length}, Time: ${result.executionTimeMs}ms`
        );

        return FireflyOkAsync(result);
    }

    private handleExecutionFailure(args: {
        error: FireflyError;
        startTime: Date;
        executedTaskIds: string[];
        skippedTaskIds: string[];
        initialContext: ExecutorContext;
    }): FireflyAsyncResult<WorkflowExecutionResult> {
        const { error, startTime, executedTaskIds, skippedTaskIds, initialContext } = args;
        const endTime = new Date();

        // Attempt rollback if enabled
        if (this.options.enableRollback && this.executedTasks.length > 0) {
            logger.verbose(`WorkflowExecutor: Attempting rollback of ${this.executedTasks.length} tasks`);

            return this.rollback(initialContext).andThen((rollbackSuccess) => {
                const result: WorkflowExecutionResult = {
                    success: false,
                    executedTasks: executedTaskIds,
                    skippedTasks: skippedTaskIds,
                    failedTask: executedTaskIds.at(-1) || "unknown",
                    error,
                    rollbackExecuted: rollbackSuccess,
                    startTime,
                    endTime,
                    executionTimeMs: endTime.getTime() - startTime.getTime(),
                };

                return FireflyOkAsync(result);
            });
        }

        const result: WorkflowExecutionResult = {
            success: false,
            executedTasks: executedTaskIds,
            skippedTasks: skippedTaskIds,
            failedTask: executedTaskIds.at(-1) || "unknown",
            error,
            rollbackExecuted: false,
            startTime,
            endTime,
            executionTimeMs: endTime.getTime() - startTime.getTime(),
        };

        return FireflyOkAsync(result);
    }

    private executeTasksSequentially(
        tasks: Task[],
        context: ExecutorContext,
        executedTaskIds: string[],
        skippedTaskIds: string[]
    ): FireflyAsyncResult<void> {
        if (tasks.length === 0) {
            return FireflyOkAsync(undefined);
        }

        // Check for abort signal before each task
        if (this.#signal?.aborted) {
            return timeoutErrAsync({
                message: "Workflow execution was aborted",
            });
        }

        const [currentTask, ...remainingTasks] = tasks;

        if (!currentTask) {
            return FireflyOkAsync(undefined);
        }

        const skipCheck = this.handleTaskSkip(currentTask, remainingTasks, context, skippedTaskIds);
        if (skipCheck.isErr()) return FireflyErrAsync(skipCheck.error);
        if (skipCheck.value.shouldSkip) {
            return this.executeTasksSequentially(
                skipCheck.value.newRemainingTasks,
                context,
                executedTaskIds,
                skippedTaskIds
            );
        }

        return this.executeTaskAndContinue(currentTask, remainingTasks, context, {
            executedTaskIds,
            skippedTaskIds,
        });
    }

    private handleTaskSkip(
        currentTask: Task,
        remainingTasks: Task[],
        context: ExecutorContext,
        skippedTaskIds: string[]
    ): FireflyResult<{ shouldSkip: boolean; newRemainingTasks: Task[] }> {
        if (!currentTask.shouldSkip) return FireflyOk({ shouldSkip: false, newRemainingTasks: remainingTasks });

        const skipResult = currentTask.shouldSkip(context);
        if (skipResult.isErr()) return FireflyErr(skipResult.error);

        if (!skipResult.value.shouldSkip) return FireflyOk({ shouldSkip: false, newRemainingTasks: remainingTasks });

        const reason = skipResult.value.reason || "condition not met";
        logger.verbose(`Task '${currentTask.meta.id}': Skipped - ${reason}`);
        skippedTaskIds.push(currentTask.meta.id);

        if (skipResult.value.skipToTasks && skipResult.value.skipToTasks.length > 0) {
            logger.verbose(
                `Task '${currentTask.meta.id}': Skipping through to ${skipResult.value.skipToTasks.join(", ")}`
            );
            const skipToIndex = remainingTasks.findIndex((t) => skipResult.value.skipToTasks?.includes(t.meta.id));
            if (skipToIndex >= 0) {
                const newRemainingTasks = remainingTasks.slice(skipToIndex);
                return FireflyOk({ shouldSkip: true, newRemainingTasks });
            }
        }

        return FireflyOk({ shouldSkip: true, newRemainingTasks: remainingTasks });
    }

    private executeTaskAndContinue(
        currentTask: Task,
        remainingTasks: Task[],
        context: ExecutorContext,
        executionLists: { executedTaskIds: string[]; skippedTaskIds: string[] }
    ): FireflyAsyncResult<void> {
        logger.verbose(`Task '${currentTask.meta.id}': Executing...`);

        return currentTask
            .execute(context)
            .andThen((updatedContext) => {
                logger.verbose(`Task '${currentTask.meta.id}': Completed`);
                executionLists.executedTaskIds.push(currentTask.meta.id);
                this.executedTasks.push(currentTask);
                return this.executeTasksSequentially(
                    remainingTasks,
                    updatedContext,
                    executionLists.executedTaskIds,
                    executionLists.skippedTaskIds
                );
            })
            .mapErr((error) => {
                logger.error(error.message);
                return error;
            });
    }

    private rollback(context: ExecutorContext): FireflyAsyncResult<boolean> {
        // Use toReversed() for non-mutating reverse - cleaner and more expressive
        const tasksToRollback = this.executedTasks.toReversed();

        logger.verbose(`Rolling back ${tasksToRollback.length} tasks in reverse order`);

        return this.rollbackTasks(tasksToRollback, context).andThen((errors) => {
            if (errors.length > 0) {
                logger.error(`Rollback completed with ${errors.length} errors`);
                for (const { taskId, error } of errors) {
                    logger.error(`  Task '${taskId}': ${error.message}`);
                }
                return FireflyOkAsync(false);
            }

            logger.verbose("Rollback completed successfully");
            return FireflyOkAsync(true);
        });
    }

    private rollbackTasks(
        tasks: Task[],
        context: ExecutorContext
    ): FireflyAsyncResult<Array<{ taskId: string; error: FireflyError }>> {
        if (tasks.length === 0) {
            return FireflyOkAsync([]);
        }

        const [currentTask, ...remainingTasks] = tasks;
        const errors: Array<{ taskId: string; error: FireflyError }> = [];

        if (!currentTask) {
            return FireflyOkAsync([]);
        }

        // Skip tasks without undo
        if (!currentTask.undo) {
            logger.verbose(`Task '${currentTask.meta.id}': No undo available, skipping rollback`);
            return this.rollbackTasks(remainingTasks, context);
        }

        logger.verbose(`Task '${currentTask.meta.id}': Rolling back...`);

        return currentTask
            .undo(context)
            .andThen(() => {
                logger.verbose(`Task '${currentTask.meta.id}': Rollback completed`);
                return this.rollbackTasks(remainingTasks, context);
            })
            .orElse((error) => {
                logger.error(`Task '${currentTask.meta.id}': Rollback failed - ${error.message}`);
                errors.push({ taskId: currentTask.meta.id, error });
                return this.rollbackTasks(remainingTasks, context).map((remainingErrors) => [
                    ...errors,
                    ...remainingErrors,
                ]);
            });
    }
}
