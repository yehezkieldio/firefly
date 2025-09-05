import { errAsync, okAsync } from "neverthrow";
import type { Task, TaskContext } from "#/modules/orchestration/contracts/task.interface";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class TaskExecutorService {
    executeTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Executing task ${task.name}`);

        return this.executeWithLifecycle(task, context)
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully executed task ${task.name}`);
                return okAsync();
            })
            .mapErr((error) => {
                logger.verbose(`TaskExecutorService: Failed to execute task ${task.name}: ${error.message}`);
                return error;
            });
    }

    undoTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Undoing task ${task.name}`);

        if (!task.canUndo?.()) {
            return errAsync(
                createFireflyError({
                    message: `Task ${task.name} cannot be undone.`,
                    code: "INVALID",
                    source: "orchestration/task-executor-service",
                }),
            );
        }

        return this.undoWithLifecycle(task, context)
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully undone task ${task.name}`);
                return okAsync();
            })
            .mapErr((error) => {
                logger.verbose(`TaskExecutorService: Failed to undo task ${task.name}: ${error.message}`);
                return error;
            });
    }

    compensateTask(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        logger.verbose(`TaskExecutorService: Compensating task ${task.name}`);

        if (!task.compensate) {
            return errAsync(
                createFireflyError({
                    message: `Task ${task.name} does not have a compensate operation defined.`,
                    code: "INVALID",
                    source: "orchestration/task-executor-service",
                }),
            );
        }

        const compensation = context ? task.compensate?.(context) : task.compensate?.({} as TaskContext);
        return compensation
            .andThen(() => {
                logger.verbose(`TaskExecutorService: Successfully compensated task ${task.name}`);
                return okAsync();
            })
            .mapErr((error) => {
                logger.verbose(`TaskExecutorService: Failed to compensate task ${task.name}: ${error.message}`);
                return error;
            });
    }

    private executeWithLifecycle(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        if (context && task.beforeExecute) {
            return task
                .beforeExecute(context)
                .andThen(() => this.performExecution(task, context))
                .andThen(() => {
                    if (task.afterExecute) {
                        return task.afterExecute(context);
                    }
                    return okAsync();
                })
                .orElse((error) => {
                    if (task.onExecuteError && context) {
                        return task.onExecuteError(error, context).andThen(() => errAsync(error));
                    }
                    return errAsync(error);
                });
        }

        return this.performExecution(task, context);
    }

    private performExecution(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        if (context && task.validate) {
            const validation = task.validate?.(context);
            if (validation.isErr()) {
                return errAsync(validation.error);
            }
        }

        const execution = context ? task.execute?.(context) : task.execute?.({} as TaskContext);
        return execution;
    }

    private undoWithLifecycle(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        if (context && task.beforeRollback) {
            return task
                .beforeRollback(context)
                .andThen(() => this.performUndo(task, context))
                .andThen(() => {
                    if (task.afterRollback) {
                        return task.afterRollback(context);
                    }
                    return okAsync();
                })
                .orElse((error) => {
                    if (task.onRollbackError && context) {
                        return task.onRollbackError(error, context).andThen(() => errAsync(error));
                    }
                    return errAsync(error);
                });
        }

        return this.performUndo(task, context);
    }

    private performUndo(task: Task, context?: TaskContext): FireflyAsyncResult<void> {
        const undoOperation = context ? task.undo?.(context) : task.undo?.({} as TaskContext);
        if (!undoOperation) {
            return errAsync(
                createFireflyError({
                    message: `Task ${task.name} does not have an undo operation defined.`,
                    code: "INVALID",
                    source: "orchestration/task-executor-service",
                }),
            );
        }

        return undoOperation;
    }
}
