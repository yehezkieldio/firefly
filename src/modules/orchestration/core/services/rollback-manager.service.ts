import z from "zod";
import type { RollbackEntry, RollbackStrategy } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task, TaskContext } from "#/modules/orchestration/core/contracts/task.interface";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";
import {
    type FireflyAsyncResult,
    type FireflyResult,
    fireflyErr,
    fireflyErrAsync,
    fireflyOk,
    fireflyOkAsync,
} from "#/shared/utils/result.util";
import { validateWithResult, withContextAsync } from "#/shared/utils/result-factory.util";

/**
 * Compensation task interface for saga pattern rollbacks.
 */
export interface CompensationTask {
    readonly id: string;
    readonly name: string;
    execute(context?: TaskContext): FireflyAsyncResult<void>;
}

/**
 * Rollback configuration options.
 */
interface RollbackConfig {
    strategy: RollbackStrategy;
    maxRetries?: number;
    continueOnError?: boolean;
    parallel?: boolean;
    timeout?: number;
}

/**
 * Rollback execution result.
 */
interface RollbackResult {
    success: boolean;
    rolledBackTasks: string[];
    failedTasks: string[];
    errors: FireflyError[];
    duration: number;
}

export class RollbackManager {
    private readonly rollbackStack: RollbackEntry[] = [];
    private readonly compensationTasks = new Map<string, CompensationTask>();
    private readonly config: RollbackConfig;

    constructor(config?: Partial<RollbackConfig>) {
        this.config = {
            strategy: config?.strategy ?? "reverse",
            maxRetries: config?.maxRetries ?? 1,
            continueOnError: config?.continueOnError ?? false,
            parallel: config?.parallel ?? false,
            timeout: config?.timeout,
        };
    }

    /**
     * Add a task to the rollback stack with validation.
     */
    addTask(task: Task): FireflyResult<void> {
        return this.validateTask(task).andThen(() => {
            const entry: RollbackEntry = {
                taskId: task.id,
                taskName: task.name,
                task,
                executionTime: new Date(),
                compensationId: undefined,
            };

            this.rollbackStack.push(entry);

            logger.verbose(`RollbackManager: Added task to rollback stack: ${task.name} (${task.id})`);
            return fireflyOk();
        });
    }

    /**
     * Register a compensation task for saga pattern rollbacks.
     */
    registerCompensation(taskId: string, compensation: CompensationTask): FireflyResult<void> {
        return validateWithResult(z.string().min(1), taskId, "taskId")
            .andThen(() => this.validateCompensationTask(compensation))
            .andThen(() => {
                this.compensationTasks.set(taskId, compensation);

                // Link compensation to the most recent rollback entry for this task
                const entry = this.rollbackStack
                    .slice()
                    .reverse()
                    .find((e) => e.taskId === taskId);

                if (entry) {
                    entry.compensationId = compensation.id;
                }

                logger.verbose(`RollbackManager: Registered compensation for task: ${taskId}`);
                return fireflyOk();
            });
    }

    /**
     * Execute rollback with the specified strategy.
     */
    executeRollback(strategy?: RollbackStrategy, context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const effectiveStrategy = strategy ?? this.config.strategy;
        const startTime = Date.now();

        if (this.rollbackStack.length === 0) {
            logger.verbose("RollbackManager: No tasks to rollback");
            return fireflyOkAsync({
                success: true,
                rolledBackTasks: [],
                failedTasks: [],
                errors: [],
                duration: 0,
            });
        }

        logger.info(`RollbackManager: Starting rollback with strategy: ${effectiveStrategy}`);

        return this.executeStrategyRollback(effectiveStrategy, context)
            .map((result) => ({
                ...result,
                duration: Date.now() - startTime,
            }))
            .mapErr((error) => {
                logger.error("RollbackManager: Rollback failed", error);
                return error;
            });
    }

    /**
     * Execute strategy-specific rollback.
     */
    private executeStrategyRollback(
        strategy: RollbackStrategy,
        context?: TaskContext,
    ): FireflyAsyncResult<RollbackResult> {
        const handlers: Readonly<Record<RollbackStrategy, (ctx?: TaskContext) => FireflyAsyncResult<RollbackResult>>> =
            {
                reverse: (ctx) => this.executeReverseRollback(ctx),
                compensation: (ctx) => this.executeCompensationRollback(ctx),
                custom: (ctx) => this.executeCustomRollback(ctx),
                none: () =>
                    fireflyOkAsync({
                        success: true,
                        rolledBackTasks: [],
                        failedTasks: [],
                        errors: [],
                        duration: 0,
                    }),
            };

        const handler = handlers[strategy];

        if (!handler) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Unknown rollback strategy: ${String(strategy)}`,
                    source: "application",
                }),
            );
        }

        return handler(context);
    }

    /**
     * Execute reverse rollback (traditional undo in reverse order).
     */
    private executeReverseRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const reversedTasks = [...this.rollbackStack].reverse();
        const result: RollbackResult = {
            success: true,
            rolledBackTasks: [],
            failedTasks: [],
            errors: [],
            duration: 0,
        };

        const processNext = (index: number): FireflyAsyncResult<RollbackResult> => {
            if (index >= reversedTasks.length) {
                return fireflyOkAsync(result);
            }

            const entry = reversedTasks[index];
            if (!entry) {
                return processNext(index + 1);
            }

            return this.executeTaskRollback(entry, context)
                .andThen(() => {
                    result.rolledBackTasks.push(entry.taskName);
                    return processNext(index + 1);
                })
                .orElse((error) => {
                    result.failedTasks.push(entry.taskName);
                    result.errors.push(error);
                    result.success = false;

                    if (this.config.continueOnError) {
                        return processNext(index + 1);
                    }
                    return fireflyOkAsync(result);
                });
        };

        return processNext(0);
    }

    /**
     * Execute compensation-based rollback (saga pattern).
     */
    private executeCompensationRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const reversedTasks = [...this.rollbackStack].reverse();
        const result: RollbackResult = {
            success: true,
            rolledBackTasks: [],
            failedTasks: [],
            errors: [],
            duration: 0,
        };

        const processNext = (index: number): FireflyAsyncResult<RollbackResult> => {
            if (index >= reversedTasks.length) {
                return fireflyOkAsync(result);
            }

            const entry = reversedTasks[index];
            if (!entry) {
                return processNext(index + 1);
            }

            const executeCompensation =
                entry.compensationId && this.compensationTasks.has(entry.compensationId)
                    ? this.executeCompensation(entry.compensationId, context)
                    : this.executeTaskRollback(entry, context);

            return executeCompensation
                .andThen(() => {
                    result.rolledBackTasks.push(entry.taskName);
                    return processNext(index + 1);
                })
                .orElse((error) => {
                    result.failedTasks.push(entry.taskName);
                    result.errors.push(error);
                    result.success = false;

                    if (this.config.continueOnError) {
                        return processNext(index + 1);
                    }
                    return fireflyOkAsync(result);
                });
        };

        return processNext(0);
    }

    /**
     * Execute custom rollback logic with hooks.
     */
    private executeCustomRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const reversedTasks = [...this.rollbackStack].reverse();
        const result: RollbackResult = {
            success: true,
            rolledBackTasks: [],
            failedTasks: [],
            errors: [],
            duration: 0,
        };

        const processNext = (index: number): FireflyAsyncResult<RollbackResult> => {
            if (index >= reversedTasks.length) {
                return fireflyOkAsync(result);
            }

            const entry = reversedTasks[index];
            if (!entry) {
                return processNext(index + 1);
            }

            // Execute with lifecycle hooks
            const executeWithHooks = (): FireflyAsyncResult<void> => {
                if (!context) {
                    return this.executeTaskRollback(entry, context);
                }

                const beforeHook = entry.task.beforeRollback?.(context) ?? fireflyOkAsync();

                return beforeHook
                    .andThen(() => this.executeTaskRollback(entry, context))
                    .andThen(() => {
                        const afterHook = entry.task.afterRollback?.(context) ?? fireflyOkAsync();
                        return afterHook;
                    });
            };

            return executeWithHooks()
                .andThen(() => {
                    result.rolledBackTasks.push(entry.taskName);
                    return processNext(index + 1);
                })
                .orElse((error) => {
                    // Execute failure hook if available
                    const failureHook = context
                        ? (entry.task.onRollbackError?.(error, context) ?? fireflyOkAsync())
                        : fireflyOkAsync();

                    return failureHook
                        .andThen(() => {
                            result.failedTasks.push(entry.taskName);
                            result.errors.push(error);
                            result.success = false;

                            if (this.config.continueOnError) {
                                return processNext(index + 1);
                            }
                            return fireflyOkAsync(result);
                        })
                        .orElse(() => {
                            result.failedTasks.push(entry.taskName);
                            result.errors.push(error);
                            result.success = false;
                            return fireflyOkAsync(result);
                        });
                });
        };

        return processNext(0);
    }

    /**
     * Execute rollback for a single task entry.
     */
    private executeTaskRollback(entry: RollbackEntry, context?: TaskContext): FireflyAsyncResult<void> {
        const { task } = entry;

        if (!task.canUndo()) {
            logger.verbose(`RollbackManager: Task ${task.name} does not support undo, skipping`);
            return fireflyOkAsync();
        }

        logger.verbose(`RollbackManager: Rolling back task: ${task.name}`);

        const undoOperation = context ? task.undo(context) : task.undo({} as TaskContext);

        return withContextAsync(undoOperation, `Failed to rollback task ${task.name}`).andThen(() => {
            logger.verbose(`RollbackManager: Successfully rolled back task: ${task.name}`);
            return fireflyOkAsync();
        });
    }

    /**
     * Execute a compensation task.
     */
    private executeCompensation(compensationId: string, context?: TaskContext): FireflyAsyncResult<void> {
        const compensation = this.compensationTasks.get(compensationId);

        if (!compensation) {
            return fireflyErrAsync(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Compensation task not found: ${compensationId}`,
                }),
            );
        }

        logger.verbose(`RollbackManager: Executing compensation: ${compensation.name}`);

        return withContextAsync(
            compensation.execute(context),
            `Failed to execute compensation ${compensation.name}`,
        ).andThen(() => {
            logger.verbose(`RollbackManager: Successfully executed compensation: ${compensation.name}`);
            return fireflyOkAsync();
        });
    }

    /**
     * Validate task before adding to rollback stack.
     */
    private validateTask(task: Task): FireflyResult<void> {
        if (!(task.id && task.name)) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: "Task must have id and name",
                }),
            );
        }
        return fireflyOk();
    }

    /**
     * Validate compensation task.
     */
    private validateCompensationTask(task: CompensationTask): FireflyResult<void> {
        if (!(task.id && task.name)) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: "CompensationTask must have id and name",
                }),
            );
        }
        return fireflyOk();
    }

    /**
     * Get the current rollback stack.
     */
    getRollbackStack(): readonly RollbackEntry[] {
        return [...this.rollbackStack];
    }

    /**
     * Clear the rollback stack and all snapshots.
     */
    clear(): void {
        this.rollbackStack.length = 0;
        this.compensationTasks.clear();
        logger.verbose("RollbackManager: Cleared rollback stack and snapshots");
    }

    /**
     * Get the number of tasks in the rollback stack.
     */
    getTaskCount(): number {
        return this.rollbackStack.length;
    }

    /**
     * Check if there are any tasks in the rollback stack.
     */
    hasTasks(): boolean {
        return this.rollbackStack.length > 0;
    }

    /**
     * Get rollback configuration.
     */
    getConfig(): Readonly<RollbackConfig> {
        return { ...this.config };
    }

    /**
     * Update rollback configuration.
     */
    updateConfig(config: Partial<RollbackConfig>): void {
        Object.assign(this.config, config);
        logger.verbose("RollbackManager: Updated configuration");
    }
}
