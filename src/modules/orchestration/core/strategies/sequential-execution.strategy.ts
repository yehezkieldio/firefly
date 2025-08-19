import type { IExecutionStrategy } from "#/modules/orchestration/core/contracts/execution-strategy.interface";
import type {
    OrchestrationContext,
    OrchestratorOptions,
} from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import { FeatureManager } from "#/modules/orchestration/core/services/feature-manager.service";
import { RollbackManager } from "#/modules/orchestration/core/services/rollback-manager.service";
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

/**
 * Sequential execution strategy for orchestrating tasks.
 */
export class SequentialExecutionStrategy implements IExecutionStrategy {
    private readonly options: OrchestratorOptions;
    private readonly startTime: Date;
    private readonly executor: TaskExecutorService;
    private readonly featureManager: FeatureManager;
    private readonly rollbackManager: RollbackManager;

    constructor(options: OrchestratorOptions) {
        this.options = options;
        this.startTime = new Date();
        this.executor = new TaskExecutorService();
        this.featureManager = FeatureManager.fromOptions(options);
        this.rollbackManager = new RollbackManager({
            strategy: options.rollbackStrategy,
            continueOnError: false,
            parallel: false,
        });
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

                logger.verbose(
                    `SequentialExecutionStrategy: Executing task ${task.name} (${index + 1}/${tasks.length})`,
                );

                return this.executor
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
        // Basic validation
        if (!task || typeof task.name !== "string" || typeof task.id !== "string") {
            logger.warn(`SequentialExecutionStrategy: Invalid task structure for task ${task?.id || "unknown"}`);
            return fireflyOk(false);
        }

        // Check if task has required features enabled
        const requiredFeatures = task.getRequiredFeatures?.() ?? [];
        if (requiredFeatures.length > 0) {
            const enabledFeatures = this.featureManager.getEnabledFeatures();
            const hasRequiredFeatures = typeof task.isEnabled === "function" ? task.isEnabled(enabledFeatures) : true;

            if (!hasRequiredFeatures) {
                logger.verbose(
                    `SequentialExecutionStrategy: Task ${task.name} disabled due to missing required features: ${requiredFeatures.join(", ")}`,
                );
                return fireflyOk(false);
            }
        }

        // Legacy feature check for backward compatibility
        if (
            this.options.enabledFeatures &&
            typeof task.isEnabled === "function" &&
            !task.isEnabled(this.options.enabledFeatures)
        ) {
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
        return fireflyOkAsync(result);
    }
}
