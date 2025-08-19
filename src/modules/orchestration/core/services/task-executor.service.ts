import type { Task, TaskContext } from "#/modules/orchestration/core/contracts/task.interface";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { withErrorContext } from "#/shared/utils/error-factory.util";
import { type FireflyAsyncResult, fireflyErrAsync, fireflyOkAsync } from "#/shared/utils/result.util";
import { withContextAsync } from "#/shared/utils/result-factory.util";

/**
 * Task execution service for managing task lifecycle and operations.
 */
export class TaskExecutorService {
    executeTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Executing task: ${task.name} (${task.id})`);

        // Execute with full lifecycle support
        return this.executeWithLifecycle(task, context)
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully executed task: ${task.name}`);
                return fireflyOkAsync();
            })
            .mapErr((error) => {
                logger.error(`TaskExecutorService: Error executing task: ${task.name}`, error);
                return withErrorContext(error, `Task execution failed: ${task.name}`);
            });
    }

    undoTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Undoing task: ${task.name} (${task.id})`);

        if (!task.canUndo?.()) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Task ${task.name} does not support undo operation`,
                    source: "application",
                }),
            );
        }

        // Execute with full rollback lifecycle support
        return this.undoWithLifecycle(task, context)
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully undone task: ${task.name}`);
                return fireflyOkAsync();
            })
            .mapErr((error) => {
                logger.error(`TaskExecutorService: Error undoing task: ${task.name}`, error);
                return withErrorContext(error, `Task undo failed: ${task.name}`);
            });
    }

    /**
     * Execute compensation logic for a task (saga pattern).
     */
    compensateTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Compensating task: ${task.name} (${task.id})`);

        if (!task.compensate) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Task ${task.name} does not support compensation`,
                    source: "application",
                }),
            );
        }

        const compensation = context ? task.compensate(context) : task.compensate({} as TaskContext);
        return withContextAsync(compensation, `Failed to compensate task ${task.name}`)
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully compensated task: ${task.name}`);
                return fireflyOkAsync();
            })
            .mapErr((error) => {
                logger.error(`TaskExecutorService: Error compensating task: ${task.name}`, error);
                return withErrorContext(error, `Task compensation failed: ${task.name}`);
            });
    }

    /**
     * Execute task with full lifecycle support (beforeExecute, execute, afterExecute, error handling).
     */
    private executeWithLifecycle(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        // Execute beforeExecute hook if available
        if (context && task.beforeExecute) {
            return task
                .beforeExecute(context)
                .andThen(() => this.performExecution(task, context))
                .andThen(() => {
                    // Execute afterExecute hook if available
                    if (task.afterExecute) {
                        return task.afterExecute(context);
                    }
                    return fireflyOkAsync();
                })
                .orElse((error) => {
                    // Handle execution errors with onExecuteError hook if available
                    if (task.onExecuteError && context) {
                        return task.onExecuteError(error, context).andThen(() => fireflyErrAsync(error));
                    }
                    return fireflyErrAsync(error);
                });
        }

        return this.performExecution(task, context);
    }

    /**
     * Perform the actual task execution.
     */
    private performExecution(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        if (context && task.validate) {
            const validationResult = task.validate?.(context);
            if (validationResult.isErr()) {
                return fireflyErrAsync(validationResult.error);
            }
        }

        const execution = context ? task.execute(context) : task.execute({} as TaskContext);
        return withContextAsync(execution, `Failed to execute task ${task.name}`);
    }

    /**
     * Execute task undo with full lifecycle support (beforeRollback, undo, afterRollback, error handling).
     */
    private undoWithLifecycle(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        // Execute beforeRollback hook if available
        if (context && task.beforeRollback) {
            return task
                .beforeRollback(context)
                .andThen(() => this.performUndo(task, context))
                .andThen(() => {
                    // Execute afterRollback hook if available
                    if (task.afterRollback) {
                        return task.afterRollback(context);
                    }
                    return fireflyOkAsync();
                })
                .orElse((error) => {
                    // Handle rollback errors with onRollbackError hook if available
                    if (task.onRollbackError && context) {
                        return task.onRollbackError(error, context).andThen(() => fireflyErrAsync(error));
                    }
                    return fireflyErrAsync(error);
                });
        }

        // Simple undo without context or hooks
        return this.performUndo(task, context);
    }

    /**
     * Perform the actual task undo.
     */
    private performUndo(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        const undoOperation = context ? task.undo?.(context) : task.undo?.({} as TaskContext);
        if (!undoOperation) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Task ${task.name} does not support undo operation`,
                    source: "application",
                }),
            );
        }

        return withContextAsync(undoOperation, `Failed to undo task ${task.name}`);
    }
}
