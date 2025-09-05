import { err, errAsync, ok, okAsync } from "neverthrow";
import z from "zod";
import type { RollbackEntry, RollbackStrategy } from "#/modules/orchestration/contracts/orchestration.interface";
import type { Task, TaskContext } from "#/modules/orchestration/contracts/task.interface";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";
import { type FireflyAsyncResult, type FireflyResult, parseSchema } from "#/shared/utils/result.util";

export interface CompensationTask {
    readonly id: string;
    readonly name: string;
    execute(context?: TaskContext): FireflyAsyncResult<void>;
}

interface RollbackConfig {
    strategy: RollbackStrategy;
    maxRetries?: number;
    continueOnError?: boolean;
    parallel?: boolean;
    timeout?: number;
}

interface RollbackResult {
    success: boolean;
    rolledBackTasks: string[];
    failedTasks: string[];
    errors: FireflyError[];
    duration: number;
}

export class RollbackManagerService {
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

            logger.verbose(`RollbackManagerService: Added task to rollback stack: ${task.name} (${task.id})`);
            return ok();
        });
    }

    registerCompensation(taskId: string, compensation: CompensationTask): FireflyResult<void> {
        const validation = parseSchema(z.string().min(1), taskId).andThen(() =>
            this.validateCompensationTask(compensation),
        );

        if (validation.isErr()) {
            return validation;
        }

        this.compensationTasks.set(taskId, compensation);

        // Link compensation to the most recent rollback entry for this task
        const entry = this.rollbackStack
            .slice()
            .reverse()
            .find((e) => e.taskId === taskId);

        if (entry) {
            entry.compensationId = compensation.id;
        }

        logger.verbose(`RollbackManagerService: Registered compensation for task: ${taskId}`);
        return ok();
    }

    executeRollback(strategy?: RollbackStrategy, context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const effectiveStrategy = strategy ?? this.config.strategy;
        const startTime = Date.now();

        if (this.rollbackStack.length === 0) {
            logger.verbose("RollbackManagerService: No tasks to rollback");
            return okAsync({
                success: true,
                rolledBackTasks: [],
                failedTasks: [],
                errors: [],
                duration: 0,
            });
        }

        logger.info(`RollbackManagerService: Starting rollback with strategy: ${effectiveStrategy}`);

        return this.executeStrategyRollback(effectiveStrategy, context)
            .map((result) => ({
                ...result,
                duration: Date.now() - startTime,
            }))
            .mapErr((error) => {
                logger.error("RollbackManagerService: Rollback failed", error);
                return error;
            });
    }

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
                    okAsync({
                        success: true,
                        rolledBackTasks: [],
                        failedTasks: [],
                        errors: [],
                        duration: 0,
                    }),
            };

        const handler = handlers[strategy];

        if (!handler) {
            return errAsync(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Unknown rollback strategy: ${String(strategy)}`,
                    source: "application",
                }),
            );
        }

        return handler(context);
    }

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
                return okAsync(result);
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
                    return okAsync(result);
                });
        };

        return processNext(0);
    }

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
                return okAsync(result);
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
                    return okAsync(result);
                });
        };

        return processNext(0);
    }

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
                return okAsync(result);
            }

            const entry = reversedTasks[index];
            if (!entry) {
                return processNext(index + 1);
            }

            const executeWithHooks = (): FireflyAsyncResult<void> => {
                if (!context) {
                    return this.executeTaskRollback(entry, context);
                }

                const beforeHook = entry.task.beforeRollback?.(context) ?? okAsync();
                return beforeHook
                    .andThen(() => this.executeTaskRollback(entry, context))
                    .andThen(() => {
                        const afterHook = entry.task.afterRollback?.(context) ?? okAsync();
                        return afterHook;
                    });
            };

            return executeWithHooks()
                .andThen(() => {
                    result.rolledBackTasks.push(entry.taskName);
                    return processNext(index + 1);
                })
                .orElse((error) => {
                    const failureHook = context
                        ? (entry.task.onRollbackError?.(error, context) ?? okAsync())
                        : okAsync();

                    return failureHook
                        .andThen(() => {
                            result.failedTasks.push(entry.taskName);
                            result.errors.push(error);
                            result.success = false;

                            if (this.config.continueOnError) {
                                return processNext(index + 1);
                            }
                            return okAsync(result);
                        })
                        .orElse(() => {
                            result.failedTasks.push(entry.taskName);
                            result.errors.push(error);
                            result.success = false;

                            return okAsync(result);
                        });
                });
        };

        return processNext(0);
    }

    private executeTaskRollback(entry: RollbackEntry, context?: TaskContext): FireflyAsyncResult<void> {
        const { task } = entry;

        if (!task.canUndo?.()) {
            logger.verbose(`RollbackManagerService: Task '${task.name}' cannot be undone. Skipping rollback.`);
            return okAsync();
        }

        logger.verbose(`RollbackManagerService: Executing rollback for task '${task.name}'`);

        if (!task.undo) {
            logger.warn(`RollbackManagerService: Task '${task.name}' does not have an undo method. Skipping rollback.`);
            return okAsync();
        }

        const undoOperation = context ? task.undo(context) : task.undo({} as TaskContext);
        return undoOperation;
    }

    private executeCompensation(compensationId: string, context?: TaskContext): FireflyAsyncResult<void> {
        const compensation = this.compensationTasks.get(compensationId);
        if (!compensation) {
            return errAsync(
                createFireflyError({
                    message: `Compensation task with id '${compensationId}' not found.`,
                    code: "NOT_FOUND",
                    source: "orchestration/rollback-manager-service",
                }),
            );
        }

        logger.verbose(`RollbackManagerService: Executing compensation task: ${compensation.name}`);

        return compensation.execute(context);
    }

    private validateTask(task: Task): FireflyResult<void> {
        if (!task.id || typeof task.id !== "string") {
            return err(
                createFireflyError({
                    message: "Task must have a valid 'id' of type string.",
                    code: "VALIDATION",
                    source: "orchestration/rollback-manager-service",
                }),
            );
        }

        if (!task.name || typeof task.name !== "string") {
            return err(
                createFireflyError({
                    message: "Task must have a valid 'name' of type string.",
                    code: "VALIDATION",
                    source: "orchestration/rollback-manager-service",
                }),
            );
        }

        return ok();
    }

    private validateCompensationTask(task: CompensationTask): FireflyResult<void> {
        if (!task.id || typeof task.id !== "string") {
            return err(
                createFireflyError({
                    message: "Compensation task must have a valid 'id' of type string.",
                    code: "VALIDATION",
                    source: "orchestration/rollback-manager-service",
                }),
            );
        }

        return ok();
    }

    getRollbackStack(): readonly RollbackEntry[] {
        return [...this.rollbackStack];
    }

    clear(): void {
        this.rollbackStack.length = 0;
        this.compensationTasks.clear();
        logger.verbose("RollbackManagerService: Cleared rollback stack and compensation tasks.");
    }

    getTaskCount(): number {
        return this.rollbackStack.length;
    }

    hasTasks(): boolean {
        return this.rollbackStack.length > 0;
    }

    getConfig(): Readonly<RollbackConfig> {
        return { ...this.config };
    }
}
