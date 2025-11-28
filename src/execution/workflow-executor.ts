import { err, errAsync, ok, okAsync } from "neverthrow";
import type { WorkflowContext } from "#/context/workflow-context";
import type { Task } from "#/task-system/task-types";
import type { FireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

export interface WorkflowExecutionResult {
    readonly success: boolean;
    readonly executedTasks: string[];
    readonly skippedTasks: string[];
    readonly failedTask?: string;
    readonly error?: FireflyError;
    readonly rollbackExecuted: boolean;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly executionTimeMs: number;
}

export interface WorkflowExecutorOptions {
    readonly dryRun?: boolean;
    readonly enableRollback?: boolean;
}

export class WorkflowExecutor {
    private readonly options: WorkflowExecutorOptions;
    private readonly executedTasks: Task[] = [];

    constructor(options: WorkflowExecutorOptions = {}) {
        this.options = options;
    }

    execute<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        tasks: Task[],
        initialContext: WorkflowContext<TConfig, TData>
    ): FireflyAsyncResult<WorkflowExecutionResult> {
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

        return okAsync(result);
    }

    private handleExecutionFailure<
        TConfig = unknown,
        TData extends Record<string, unknown> = Record<string, unknown>,
    >(args: {
        error: FireflyError;
        startTime: Date;
        executedTaskIds: string[];
        skippedTaskIds: string[];
        initialContext: WorkflowContext<TConfig, TData>;
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

                return okAsync(result);
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

        return okAsync(result);
    }

    private executeTasksSequentially<
        TConfig = unknown,
        TData extends Record<string, unknown> = Record<string, unknown>,
    >(
        tasks: Task[],
        context: WorkflowContext<TConfig, TData>,
        executedTaskIds: string[],
        skippedTaskIds: string[]
    ): FireflyAsyncResult<void> {
        if (tasks.length === 0) {
            return okAsync();
        }

        const [currentTask, ...remainingTasks] = tasks;

        if (!currentTask) {
            return okAsync();
        }

        const skipCheck = this.handleTaskSkip(currentTask, remainingTasks, context, skippedTaskIds);
        if (skipCheck.isErr()) return errAsync(skipCheck.error);
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

    private handleTaskSkip<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        currentTask: Task,
        remainingTasks: Task[],
        context: WorkflowContext<TConfig, TData>,
        skippedTaskIds: string[]
    ): FireflyResult<{ shouldSkip: boolean; newRemainingTasks: Task[] }> {
        if (!currentTask.shouldSkip) return ok({ shouldSkip: false, newRemainingTasks: remainingTasks });

        const skipResult = currentTask.shouldSkip(context);
        if (skipResult.isErr()) return err(skipResult.error);

        if (!skipResult.value.shouldSkip) return ok({ shouldSkip: false, newRemainingTasks: remainingTasks });

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
                return ok({ shouldSkip: true, newRemainingTasks });
            }
        }

        return ok({ shouldSkip: true, newRemainingTasks: remainingTasks });
    }

    private executeTaskAndContinue<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        currentTask: Task,
        remainingTasks: Task[],
        context: WorkflowContext<TConfig, TData>,
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
                logger.error(`Task '${currentTask.meta.id}': Failed - ${error.message}`);
                return error;
            });
    }

    private rollback<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
        context: WorkflowContext<TConfig, TData>
    ): FireflyAsyncResult<boolean> {
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
        context: WorkflowContext<TConfig, TData>
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
