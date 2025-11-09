import { errAsync, okAsync } from "neverthrow";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";
import { logger } from "#/shared/logger";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Workflow execution result.
 */
export interface WorkflowExecutionResult {
    readonly success: boolean;
    readonly executionId: string;
    readonly executedTasks: string[];
    readonly skippedTasks: string[];
    readonly failedTask?: string;
    readonly error?: FireflyError;
    readonly rollbackExecuted: boolean;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly executionTimeMs: number;
}

/**
 * Workflow executor options.
 */
export interface WorkflowExecutorOptions {
    /**
     * Dry run mode - tasks should not make actual changes.
     */
    readonly dryRun?: boolean;

    /**
     * Enable rollback on failure.
     */
    readonly enableRollback?: boolean;
}

/**
 * Simplified workflow executor.
 * Executes tasks sequentially in order with clear semantics.
 */
export class WorkflowExecutor {
    private readonly options: WorkflowExecutorOptions;
    private readonly executedTasks: Task[] = [];

    constructor(options: WorkflowExecutorOptions = {}) {
        this.options = options;
    }

    /**
     * Execute a workflow with the given tasks and context.
     */
    execute<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        tasks: Task[],
        initialContext: WorkflowContext<TConfig, TData>,
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        const startTime = new Date();
        const executedTaskIds: string[] = [];
        const skippedTaskIds: string[] = [];

        if (this.options.dryRun) {
            logger.warn("Workflow executing in DRY RUN mode - no actual changes will be made");
        }

        logger.verbose(`WorkflowExecutor: Starting execution of ${tasks.length} tasks`);

        return this.executeTasksSequentially(tasks, initialContext, executedTaskIds, skippedTaskIds)
            .andThen(() => {
                const endTime = new Date();
                const result: WorkflowExecutionResult = {
                    success: true,
                    executionId: initialContext.executionId,
                    executedTasks: executedTaskIds,
                    skippedTasks: skippedTaskIds,
                    rollbackExecuted: false,
                    startTime,
                    endTime,
                    executionTimeMs: endTime.getTime() - startTime.getTime(),
                };

                logger.verbose("WorkflowExecutor: Execution completed successfully");
                logger.verbose(
                    `  Executed: ${executedTaskIds.length}, Skipped: ${skippedTaskIds.length}, Time: ${result.executionTimeMs}ms`,
                );

                return okAsync(result);
            })
            .orElse((error) => {
                const endTime = new Date();

                // Attempt rollback if enabled
                if (this.options.enableRollback && this.executedTasks.length > 0) {
                    logger.verbose(`WorkflowExecutor: Attempting rollback of ${this.executedTasks.length} tasks`);

                    return this.rollback(initialContext).andThen((rollbackSuccess) => {
                        const result: WorkflowExecutionResult = {
                            success: false,
                            executionId: initialContext.executionId,
                            executedTasks: executedTaskIds,
                            skippedTasks: skippedTaskIds,
                            failedTask: executedTaskIds[executedTaskIds.length] || "unknown",
                            error,
                            rollbackExecuted: rollbackSuccess,
                            startTime,
                            endTime,
                            executionTimeMs: endTime.getTime() - startTime.getTime(),
                        };

                        return okAsync(result);
                    });
                }

                const result: WorkflowExecutionResult = {
                    success: false,
                    executionId: initialContext.executionId,
                    executedTasks: executedTaskIds,
                    skippedTasks: skippedTaskIds,
                    failedTask: executedTaskIds[executedTaskIds.length] || "unknown",
                    error,
                    rollbackExecuted: false,
                    startTime,
                    endTime,
                    executionTimeMs: endTime.getTime() - startTime.getTime(),
                };

                return okAsync(result);
            });
    }

    private executeTasksSequentially<
        TConfig = unknown,
        TData extends Record<string, unknown> = Record<string, unknown>,
    >(
        tasks: Task[],
        context: WorkflowContext<TConfig, TData>,
        executedTaskIds: string[],
        skippedTaskIds: string[],
    ): FireflyAsyncResult<void> {
        if (tasks.length === 0) {
            return okAsync();
        }

        const [currentTask, ...remainingTasks] = tasks;

        if (!currentTask) {
            return okAsync();
        }

        // Check if task should be skipped
        if (currentTask.shouldSkip) {
            const skipResult = currentTask.shouldSkip(context);
            if (skipResult.isErr()) {
                return errAsync(skipResult.error);
            }

            if (skipResult.value.shouldSkip) {
                const reason = skipResult.value.reason || "condition not met";
                logger.verbose(`Task '${currentTask.meta.id}': Skipped - ${reason}`);
                skippedTaskIds.push(currentTask.meta.id);

                // Handle skip-to tasks
                if (skipResult.value.skipToTasks && skipResult.value.skipToTasks.length > 0) {
                    logger.verbose(
                        `Task '${currentTask.meta.id}': Skipping through to ${skipResult.value.skipToTasks.join(", ")}`,
                    );
                    // Find tasks to skip to and continue from there
                    const skipToIndex = remainingTasks.findIndex((t) =>
                        skipResult.value.skipToTasks?.includes(t.meta.id),
                    );
                    if (skipToIndex >= 0) {
                        const newRemainingTasks = remainingTasks.slice(skipToIndex);
                        return this.executeTasksSequentially(
                            newRemainingTasks,
                            context,
                            executedTaskIds,
                            skippedTaskIds,
                        );
                    }
                }

                return this.executeTasksSequentially(remainingTasks, context, executedTaskIds, skippedTaskIds);
            }
        }

        // Execute task
        logger.verbose(`Task '${currentTask.meta.id}': Executing...`);

        return currentTask
            .execute(context)
            .andThen((updatedContext) => {
                logger.verbose(`Task '${currentTask.meta.id}': Completed`);
                executedTaskIds.push(currentTask.meta.id);
                this.executedTasks.push(currentTask);

                // Continue with remaining tasks using updated context
                return this.executeTasksSequentially(remainingTasks, updatedContext, executedTaskIds, skippedTaskIds);
            })
            .mapErr((error) => {
                logger.error(`Task '${currentTask.meta.id}': Failed - ${error.message}`);
                return error;
            });
    }

    private rollback<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        context: WorkflowContext<TConfig, TData>,
    ): FireflyAsyncResult<boolean> {
        // Rollback in reverse order
        const tasksToRollback = [...this.executedTasks].reverse();

        logger.verbose(`Rolling back ${tasksToRollback.length} tasks in reverse order`);

        return this.rollbackTasks(tasksToRollback, context).andThen((errors) => {
            if (errors.length > 0) {
                logger.error(`Rollback completed with ${errors.length} errors`);
                for (const { taskId, error } of errors) {
                    logger.error(`  Task '${taskId}': ${error.message}`);
                }
                return okAsync(false);
            }

            logger.verbose("Rollback completed successfully");
            return okAsync(true);
        });
    }

    private rollbackTasks<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        tasks: Task[],
        context: WorkflowContext<TConfig, TData>,
    ): FireflyAsyncResult<Array<{ taskId: string; error: FireflyError }>> {
        if (tasks.length === 0) {
            return okAsync([]);
        }

        const [currentTask, ...remainingTasks] = tasks;
        const errors: Array<{ taskId: string; error: FireflyError }> = [];

        if (!currentTask) {
            return okAsync([]);
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
