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
}

interface RollbackResult {
    success: boolean;
    rolledBackTasks: string[];
    failedTasks: string[];
    errors: FireflyError[];
    duration: number;
}

type RollbackStrategyHandler = (context?: TaskContext) => FireflyAsyncResult<RollbackResult>;
type TaskExecutionFn = (entry: RollbackEntry, context?: TaskContext) => FireflyAsyncResult<void>;

export class RollbackManagerService {
    private readonly rollbackStack: RollbackEntry[] = [];
    private readonly compensationTasks = new Map<string, CompensationTask>();
    private readonly config: RollbackConfig;

    protected constructor(config?: Partial<RollbackConfig>) {
        this.config = {
            strategy: config?.strategy ?? "reverse",
            maxRetries: config?.maxRetries ?? 1,
            continueOnError: config?.continueOnError ?? false,
            parallel: config?.parallel ?? false,
        };
    }

    static create(config?: Partial<RollbackConfig>): FireflyResult<RollbackManagerService> {
        return parseSchema(
            z.object({
                strategy: z.enum(["reverse", "compensation", "custom", "none"]).default("reverse"),
                maxRetries: z.number().min(0).optional(),
                continueOnError: z.boolean().optional(),
                parallel: z.boolean().optional(),
            }),
            config ?? {},
        ).map((validatedConfig) => new RollbackManagerService(validatedConfig));
    }

    addTask(task: Task): FireflyResult<void> {
        return this.validateTask(task).andThen(() => {
            const entry: RollbackEntry = {
                taskId: task.id,
                task,
                executionTime: new Date(),
                compensationId: undefined,
            };

            if (!task.canUndo?.()) {
                return ok();
            }

            this.rollbackStack.push(entry);

            logger.verbose(`RollbackManagerService: Added task to rollback stack: '${task.id}'`);
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
        const handlers: Readonly<Record<RollbackStrategy, RollbackStrategyHandler>> = {
            reverse: (ctx) => this.executeReverseRollback(ctx),
            compensation: (ctx) => this.executeCompensationRollback(ctx),
            custom: (ctx) => this.executeCustomRollback(ctx),
            none: () => okAsync(this.createEmptyResult()),
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

    private createEmptyResult(): RollbackResult {
        return {
            success: true,
            rolledBackTasks: [],
            failedTasks: [],
            errors: [],
            duration: 0,
        };
    }

    private handleRollbackError(result: RollbackResult, entry: RollbackEntry, error: FireflyError): void {
        result.failedTasks.push(entry.taskId);
        result.errors.push(error);
        result.success = false;
    }

    private executeRollbackSequence(
        entries: RollbackEntry[],
        executeFn: TaskExecutionFn,
        context?: TaskContext,
    ): FireflyAsyncResult<RollbackResult> {
        const result = this.createEmptyResult();
        const reversedEntries = [...entries].reverse();

        const processSequentially = (index: number): FireflyAsyncResult<RollbackResult> => {
            if (index >= reversedEntries.length) {
                return okAsync(result);
            }

            const entry = reversedEntries[index];
            if (!entry) {
                return processSequentially(index + 1);
            }

            return this.executeWithRetries(() => executeFn(entry, context), this.config.maxRetries ?? 1)
                .andThen(() => {
                    result.rolledBackTasks.push(entry.taskId);
                    return processSequentially(index + 1);
                })
                .orElse((error) => {
                    this.handleRollbackError(result, entry, error);
                    if (this.config.continueOnError) {
                        return processSequentially(index + 1);
                    }
                    return okAsync(result);
                });
        };

        return processSequentially(0);
    }

    private executeWithRetries<T>(operation: () => FireflyAsyncResult<T>, maxRetries: number): FireflyAsyncResult<T> {
        const attemptOperation = (attempt: number): FireflyAsyncResult<T> => {
            return operation().orElse((error) => {
                if (attempt < maxRetries) {
                    logger.verbose(`RollbackManagerService: Retry attempt ${attempt + 1}/${maxRetries}`);
                    return attemptOperation(attempt + 1);
                }
                return errAsync(error);
            });
        };

        return attemptOperation(0);
    }

    private executeReverseRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        return this.executeRollbackSequence(
            this.rollbackStack,
            (entry, ctx) => this.executeTaskRollback(entry, ctx),
            context,
        );
    }

    private executeCompensationRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const executeCompensationOrFallback = (entry: RollbackEntry, ctx?: TaskContext): FireflyAsyncResult<void> => {
            if (entry.compensationId && this.compensationTasks.has(entry.compensationId)) {
                return this.executeCompensation(entry.compensationId, ctx);
            }
            return this.executeTaskRollback(entry, ctx);
        };

        return this.executeRollbackSequence(this.rollbackStack, executeCompensationOrFallback, context);
    }

    private executeCustomRollback(context?: TaskContext): FireflyAsyncResult<RollbackResult> {
        const executeWithHooks = (entry: RollbackEntry, ctx?: TaskContext): FireflyAsyncResult<void> => {
            if (!ctx) {
                return this.executeTaskRollback(entry, ctx);
            }

            const beforeHook = entry.task.beforeRollback?.(ctx) ?? okAsync();
            return beforeHook
                .andThen(() => this.executeTaskRollback(entry, ctx))
                .andThen(() => {
                    const afterHook = entry.task.afterRollback?.(ctx) ?? okAsync();
                    return afterHook;
                })
                .orElse((error) => {
                    const failureHook = entry.task.onRollbackError?.(error, ctx) ?? okAsync();
                    return failureHook.andThen(() => errAsync(error));
                });
        };

        return this.executeRollbackSequence(this.rollbackStack, executeWithHooks, context);
    }

    private executeTaskRollback(entry: RollbackEntry, context?: TaskContext): FireflyAsyncResult<void> {
        const { task } = entry;

        if (!task.canUndo?.()) {
            logger.verbose(`RollbackManagerService: Task '${task.id}' cannot be undone. Skipping rollback.`);
            return okAsync();
        }

        logger.verbose(`RollbackManagerService: Executing rollback for task '${task.id}'`);

        if (!task.undo) {
            logger.warn(`RollbackManagerService: Task '${task.id}' does not have an undo method. Skipping rollback.`);
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
