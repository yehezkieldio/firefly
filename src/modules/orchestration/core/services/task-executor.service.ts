import type { Task, TaskContext } from "#/modules/orchestration/core/contracts/task.interface";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { withErrorContext } from "#/shared/utils/error-factory.util";
import { type FireflyAsyncResult, fireflyErrAsync, fireflyOkAsync } from "#/shared/utils/result.util";
import { withContextAsync } from "#/shared/utils/result-factory.util";

export class TaskExecutorService {
    executeTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Executing task: ${task.name} (${task.id})`);

        if (context && task.beforeExecute) {
            return task
                .beforeExecute(context)
                .andThen(() => this.performExecution(task, context))
                .andThen(() => {
                    if (task.afterExecute) {
                        return task.afterExecute(context);
                    }
                    return fireflyOkAsync();
                })
                .andThen(() => {
                    logger.verbose(`TaskExecutorService: Successfully executed task: ${task.name}`);
                    return fireflyOkAsync();
                })
                .mapErr((error) => {
                    logger.error(`TaskExecutorService: Error executing task: ${task.name}`, error);
                    if (task.onExecuteError && context) {
                        task.onExecuteError(error, context);
                    }
                    return withErrorContext(error, `Task execution failed: ${task.name}`);
                });
        }

        return this.performExecution(task, context)
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

        if (!task.canUndo()) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Task ${task.name} does not support undo operation`,
                    source: "application",
                }),
            );
        }

        if (context && task.beforeRollback) {
            return task
                .beforeRollback(context)
                .andThen(() => this.performUndo(task, context))
                .andThen(() => {
                    if (task.afterRollback) {
                        return task.afterRollback(context);
                    }
                    return fireflyOkAsync();
                })
                .andThen(() => {
                    logger.verbose(`TaskExecutorService: Successfully undone task: ${task.name}`);
                    return fireflyOkAsync();
                })
                .mapErr((error) => {
                    logger.error(`TaskExecutorService: Error undoing task: ${task.name}`, error);
                    if (task.onRollbackError && context) {
                        task.onRollbackError(error, context);
                    }
                    return withErrorContext(error, `Task undo failed: ${task.name}`);
                });
        }

        return this.performUndo(task, context)
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
     * Perform the actual task execution.
     */
    private performExecution(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        if (context) {
            const validationResult = task.validate(context);
            if (validationResult.isErr()) {
                return fireflyErrAsync(validationResult.error);
            }
        }

        const execution = context ? task.execute(context) : task.execute({} as TaskContext);
        return withContextAsync(execution, `Failed to execute task ${task.name}`);
    }

    /**
     * Perform the actual task undo.
     */
    private performUndo(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        const undoOperation = context ? task.undo(context) : task.undo({} as TaskContext);
        return withContextAsync(undoOperation, `Failed to undo task ${task.name}`);
    }
}
