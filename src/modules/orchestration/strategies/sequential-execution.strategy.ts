import { errAsync, ok, okAsync } from "neverthrow";
import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import type {
    OrchestrationContext,
    OrchestratorOptions,
} from "#/modules/orchestration/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/contracts/workflow.interface";
import { FeatureManagerService } from "#/modules/orchestration/feature-manager.service";
import { RollbackManagerService } from "#/modules/orchestration/rollback-manager.service";
import { TaskExecutorService } from "#/modules/orchestration/task-executor.service";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class SequentialExecutionStrategy implements IExecutionStrategy {
    private readonly options: OrchestratorOptions;
    private readonly startTime: Date;
    private readonly taskExecutor: TaskExecutorService;
    private readonly featureManager!: FeatureManagerService;
    private readonly rollbackManager!: RollbackManagerService;

    constructor(options: OrchestratorOptions) {
        this.options = options;
        this.startTime = new Date();

        const rollbackManagerOptions = {
            strategy: options.rollbackStrategy,
            continueOnError: false,
            parallel: false,
        };

        this.taskExecutor = new TaskExecutorService();

        const rollbackManager = RollbackManagerService.create(rollbackManagerOptions);
        if (rollbackManager.isOk()) {
            this.rollbackManager = rollbackManager.value;
        }

        const featureManager = FeatureManagerService.create(options);
        if (featureManager.isOk()) {
            this.featureManager = featureManager.value;
        }
    }

    execute(tasks: readonly Task[], context?: OrchestrationContext): FireflyAsyncResult<WorkflowResult> {
        logger.verbose(`SequentialExecutionStrategy: Starting execution of ${tasks.length} tasks`);

        const executedTasks: string[] = [];
        const failedTasks: string[] = [];
        const skippedTasks: string[] = [];
        let rollbackExecuted = false;
        let compensationExecuted = false;

        const executeNext = (index: number): FireflyAsyncResult<WorkflowResult> => {
            if (index >= tasks.length) {
                return this.createResult(true, executedTasks, failedTasks, skippedTasks, {
                    rollbackExecuted,
                    compensationExecuted,
                });
            }

            const task = tasks[index];
            if (!task) {
                return errAsync(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task at index ${index} is undefined`,
                        source: "orchestration/sequential-execution-strategy",
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

                logger.verbose(
                    `SequentialExecutionStrategy: Executing task ${task.name} (${index + 1}/${tasks.length})`,
                );

                return this.taskExecutor
                    .executeTask(task, context)
                    .andThen(() => {
                        // Add successfully executed task to rollback stack
                        const addResult = this.rollbackManager.addTask(task);
                        if (addResult.isErr()) {
                            logger.warn(`Failed to add task ${task.name} to rollback stack`, addResult.error);
                        }

                        executedTasks.push(task.id);
                        return executeNext(index + 1);
                    })
                    .orElse((error) => {
                        failedTasks.push(task.id);
                        logger.error(`SequentialExecutionStrategy: Task ${task.name} failed`, error);

                        // Execute rollback if strategy is not 'none'
                        if (this.options.rollbackStrategy !== "none") {
                            logger.info(
                                `SequentialExecutionStrategy: Executing rollback with strategy: ${this.options.rollbackStrategy}`,
                            );

                            return this.rollbackManager
                                .executeRollback(this.options.rollbackStrategy, context)
                                .andThen((rollbackResult) => {
                                    rollbackExecuted = rollbackResult.success;
                                    compensationExecuted =
                                        this.options.rollbackStrategy === "compensation" && rollbackResult.success;

                                    if (rollbackResult.success) {
                                        logger.info("SequentialExecutionStrategy: Rollback completed successfully");
                                    } else {
                                        logger.error(
                                            "SequentialExecutionStrategy: Rollback failed",
                                            rollbackResult.errors,
                                        );
                                    }

                                    return this.createResult(false, executedTasks, failedTasks, skippedTasks, {
                                        error,
                                        rollbackExecuted,
                                        compensationExecuted,
                                    });
                                })
                                .orElse((rollbackError) => {
                                    logger.error(
                                        "SequentialExecutionStrategy: Rollback execution failed",
                                        rollbackError,
                                    );
                                    return this.createResult(false, executedTasks, failedTasks, skippedTasks, {
                                        error,
                                        rollbackExecuted: false,
                                        compensationExecuted: false,
                                    });
                                });
                        }

                        return this.createResult(false, executedTasks, failedTasks, skippedTasks, {
                            error,
                            rollbackExecuted: false,
                            compensationExecuted: false,
                        });
                    });
            });
        };

        return executeNext(0);
    }

    private shouldExecuteTask(task: Task): FireflyResult<boolean> {
        if (!task || typeof task.name !== "string" || typeof task.id !== "string") {
            logger.warn(`SequentialExecutionStrategy: Invalid task structure for task ${task?.id || "unknown"}`);
            return ok(false);
        }

        const requiredFeatures = task.getRequiredFeatures?.() ?? [];
        if (requiredFeatures.length > 0) {
            const enabledFeatures = this.featureManager.getEnabledFeatures();
            const hasRequiredFeatures = typeof task.isEnabled === "function" ? task.isEnabled(enabledFeatures) : true;

            if (!hasRequiredFeatures) {
                logger.verbose(
                    `SequentialExecutionStrategy: Task ${task.name} disabled due to missing required features: ${requiredFeatures.join(", ")}`,
                );
                return ok(false);
            }
        }

        return ok(true);
    }

    private createResult(
        success: boolean,
        executedTasks: string[],
        failedTasks: string[],
        skippedTasks: string[],
        options?: {
            error?: FireflyError;
            rollbackExecuted?: boolean;
            compensationExecuted?: boolean;
        },
    ): FireflyAsyncResult<WorkflowResult> {
        const endTime = new Date();
        const result: WorkflowResult = {
            success,
            executionId: this.options.executionId ?? "unknown",
            workflowId: this.options.name ?? "sequential-workflow",
            executedTasks,
            failedTasks,
            skippedTasks,
            error: options?.error,
            rollbackExecuted: options?.rollbackExecuted ?? false,
            compensationExecuted: options?.compensationExecuted ?? false,
            startTime: this.startTime,
            endTime,
            executionTime: endTime.getTime() - this.startTime.getTime(),
        };
        return okAsync(result);
    }
}
