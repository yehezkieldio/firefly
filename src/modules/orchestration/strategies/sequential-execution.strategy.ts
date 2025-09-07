import { errAsync, ok, okAsync } from "neverthrow";
import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import type {
    OrchestrationContext,
    OrchestratorOptions,
} from "#/modules/orchestration/contracts/orchestration.interface";
import { type Task, isConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import type { WorkflowResult } from "#/modules/orchestration/contracts/workflow.interface";
import { FeatureManagerService } from "#/modules/orchestration/feature-manager.service";
import { RollbackManagerService } from "#/modules/orchestration/rollback-manager.service";
import { TaskExecutorService } from "#/modules/orchestration/task-executor.service";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

interface ExecutionNode {
    task: Task;
    visited: boolean;
    nextTaskIds?: string[];
}

export class SequentialExecutionStrategy implements IExecutionStrategy {
    private readonly options: OrchestratorOptions;
    private readonly startTime: Date;
    private readonly taskExecutor: TaskExecutorService;
    private readonly featureManager!: FeatureManagerService;
    private readonly rollbackManager!: RollbackManagerService;
    private readonly taskMap: Map<string, ExecutionNode>;

    constructor(options: OrchestratorOptions) {
        this.options = options;
        this.startTime = new Date();
        this.taskMap = new Map();

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
        this.initializeTaskMap(tasks);

        const executedTasks: string[] = [];
        const failedTasks: string[] = [];
        const skippedTasks: string[] = [];
        let rollbackExecuted = false;
        let compensationExecuted = false;

        const executionQueue: string[] = this.getInitialExecutionQueue(tasks);

        const executeNext = (): FireflyAsyncResult<WorkflowResult> => {
            const nextTaskId = this.getNextExecutableTask(executionQueue);

            if (!nextTaskId) {
                return this.createResult(true, executedTasks, failedTasks, skippedTasks, {
                    rollbackExecuted,
                    compensationExecuted,
                });
            }

            const taskNode = this.taskMap.get(nextTaskId);
            if (!taskNode) {
                return errAsync(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task node not found for ID: ${nextTaskId}`,
                        source: "orchestration/sequential-execution-strategy",
                    }),
                );
            }

            const task = taskNode.task;

            taskNode.visited = true;

            const shouldExecuteResult = this.shouldExecuteTask(task, context);
            return shouldExecuteResult.asyncAndThen((shouldExecute) => {
                if (!shouldExecute) {
                    skippedTasks.push(task.id);
                    this.removeFromQueue(executionQueue, nextTaskId);
                    return executeNext();
                }

                return this.taskExecutor
                    .executeTask(task, context)
                    .andThen(() => {
                        const addResult = this.rollbackManager.addTask(task);
                        if (addResult.isErr()) {
                            logger.warn(`Failed to add task '${task.id}' to rollback stack`, addResult.error);
                        }

                        executedTasks.push(task.id);
                        this.removeFromQueue(executionQueue, nextTaskId);

                        const addNextTasksResult = this.addDynamicNextTasks(task, executionQueue, context);
                        if (addNextTasksResult.isErr()) {
                            logger.warn(`Failed to resolve next tasks for '${task.id}'`, addNextTasksResult.error);
                        }

                        return executeNext();
                    })
                    .orElse((error) => {
                        failedTasks.push(task.id);
                        logger.error(`SequentialExecutionStrategy: Task '${task.id}' failed`, error);

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

        return executeNext();
    }

    private initializeTaskMap(tasks: readonly Task[]): void {
        this.taskMap.clear();
        for (const task of tasks) {
            this.taskMap.set(task.id, {
                task,
                visited: false,
            });
        }
    }

    private getInitialExecutionQueue(tasks: readonly Task[]): string[] {
        const entryTasks = tasks.filter((task) => {
            const deps = task.getDependencies?.() ?? [];
            return deps.length === 0 && (task.isEntryPoint?.() ?? true);
        });

        if (entryTasks.length === 0) {
            const firstTask = tasks.find((task) => task.isEntryPoint?.() ?? true);
            return firstTask ? [firstTask.id] : [];
        }

        return entryTasks.map((task) => task.id);
    }

    private getNextExecutableTask(queue: string[]): string | null {
        for (const taskId of queue) {
            const taskNode = this.taskMap.get(taskId);
            if (!taskNode || taskNode.visited) {
                continue;
            }

            const dependencies = taskNode.task.getDependencies?.() ?? [];
            const allDependenciesExecuted = dependencies.every((depId) => {
                const depNode = this.taskMap.get(depId);
                return depNode?.visited === true;
            });

            if (allDependenciesExecuted) {
                return taskId;
            }
        }

        return null;
    }

    private removeFromQueue(queue: string[], taskId: string): void {
        const index = queue.indexOf(taskId);
        if (index > -1) {
            queue.splice(index, 1);
        }
    }

    private addDynamicNextTasks(task: Task, queue: string[], context?: OrchestrationContext): FireflyResult<void> {
        let hasExplicitNextTasks = false;

        // First, handle explicit next tasks from conditional tasks
        if (isConditionalTask(task)) {
            const nextTasksResult = task.getNextTasks?.(context);
            if (nextTasksResult?.isOk()) {
                const nextTasks = nextTasksResult.value;
                hasExplicitNextTasks = nextTasks.length > 0;

                for (const nextTaskId of nextTasks) {
                    if (this.taskMap.has(nextTaskId) && !queue.includes(nextTaskId)) {
                        queue.push(nextTaskId);
                        logger.verbose(
                            `SequentialExecutionStrategy: Added dynamic next task '${nextTaskId}' from '${task.id}'`,
                        );
                    }
                }
            } else if (nextTasksResult?.isErr()) {
                logger.warn(`Failed to get next tasks from '${task.id}'`, nextTasksResult.error);
            }
        }

        // Only add implicit dependents if there are no explicit next tasks
        if (!hasExplicitNextTasks) {
            for (const [taskId, taskNode] of this.taskMap) {
                const dependencies = taskNode.task.getDependencies?.() ?? [];
                if (dependencies.includes(task.id) && !queue.includes(taskId) && !taskNode.visited) {
                    queue.push(taskId);
                    logger.verbose(`SequentialExecutionStrategy: Added dependent task '${taskId}' from '${task.id}'`);
                }
            }

            const dependents = task.getDependents?.() ?? [];
            for (const dependentId of dependents) {
                if (this.taskMap.has(dependentId) && !queue.includes(dependentId)) {
                    queue.push(dependentId);
                    logger.verbose(
                        `SequentialExecutionStrategy: Added dependent task '${dependentId}' from '${task.id}'`,
                    );
                }
            }
        }

        return ok();
    }

    private shouldExecuteTask(task: Task, context?: OrchestrationContext): FireflyResult<boolean> {
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
                    `SequentialExecutionStrategy: Task '${task.id}' disabled due to missing required features: ${requiredFeatures.join(", ")}`,
                );
                return ok(false);
            }
        }

        if (isConditionalTask(task)) {
            const shouldExecuteResult = task.shouldExecute(context);
            if (shouldExecuteResult.isErr()) {
                logger.warn(
                    `SequentialExecutionStrategy: Error evaluating conditions for task '${task.id}'`,
                    shouldExecuteResult.error,
                );
                return ok(false);
            }

            if (!shouldExecuteResult.value) {
                logger.verbose(`SequentialExecutionStrategy: Skipping task '${task.id}' due to runtime conditions`);
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
