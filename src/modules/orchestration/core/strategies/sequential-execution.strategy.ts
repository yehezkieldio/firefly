import type { IExecutionStrategy } from "#/modules/orchestration/core/contracts/execution-strategy.interface";
import type {
    OrchestrationContext,
    OrchestratorOptions,
} from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import { TaskExecutorService } from "#/modules/orchestration/core/services/task-executor.service";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";
import {
    type FireflyAsyncResult,
    type FireflyResult,
    fireflyErrAsync,
    fireflyOk,
    fireflyOkAsync,
} from "#/shared/utils/result.util";

export class SequentialExecutionStrategy implements IExecutionStrategy {
    private readonly options: OrchestratorOptions;
    private readonly startTime: Date;
    private readonly executor: TaskExecutorService;

    constructor(options: OrchestratorOptions) {
        this.options = options;
        this.startTime = new Date();
        this.executor = new TaskExecutorService();
    }

    execute(tasks: readonly Task[], context?: OrchestrationContext): FireflyAsyncResult<WorkflowResult> {
        logger.info(`SequentialExecutionStrategy: Starting execution of ${tasks.length} tasks`);

        const executedTasks: string[] = [];
        const failedTasks: string[] = [];
        const skippedTasks: string[] = [];

        const executeNext = (index: number): FireflyAsyncResult<WorkflowResult> => {
            if (index >= tasks.length) {
                return this.createResult(true, executedTasks, failedTasks, skippedTasks);
            }

            const task = tasks[index];
            if (!task) {
                return fireflyErrAsync(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task at index ${index} is undefined`,
                        source: "application",
                    }),
                );
            }

            const shouldExecuteResult = this.shouldExecuteTask(task);
            return shouldExecuteResult.asyncAndThen((shouldExecute) => {
                if (!shouldExecute) {
                    logger.verbose(`SequentialExecutionStrategy: Skipping task ${task.name}`);
                    skippedTasks.push(task.id);
                    return executeNext(index + 1);
                }

                logger.info(`SequentialExecutionStrategy: Executing task ${task.name} (${index + 1}/${tasks.length})`);
                return this.executor
                    .executeTask(task, context)
                    .andThen(() => {
                        executedTasks.push(task.id);
                        return executeNext(index + 1);
                    })
                    .orElse((error) => {
                        failedTasks.push(task.id);
                        logger.error(`SequentialExecutionStrategy: Task ${task.name} failed`, error);
                        return this.createResult(false, executedTasks, failedTasks, skippedTasks, error);
                    });
            });
        };

        return executeNext(0);
    }

    private shouldExecuteTask(task: Task): FireflyResult<boolean> {
        if (!task || typeof task.name !== "string" || typeof task.id !== "string") {
            return fireflyOk(false);
        }
        if (this.options.enabledFeatures && !task.isEnabled(this.options.enabledFeatures)) {
            logger.verbose(`SequentialExecutionStrategy: Task ${task.name} disabled due to missing required features`);
            return fireflyOk(false);
        }
        return fireflyOk(true);
    }

    private createResult(
        success: boolean,
        executedTasks: string[],
        failedTasks: string[],
        skippedTasks: string[],
        error?: FireflyError,
    ): FireflyAsyncResult<WorkflowResult> {
        const endTime = new Date();
        const result: WorkflowResult = {
            success,
            executionId: this.options.executionId ?? "unknown",
            workflowId: this.options.name ?? "sequential-workflow",
            executedTasks,
            failedTasks,
            skippedTasks,
            error,
            rollbackExecuted: false,
            compensationExecuted: false,
            startTime: this.startTime,
            endTime,
            executionTime: endTime.getTime() - this.startTime.getTime(),
        };
        return fireflyOkAsync(result);
    }
}
