/**
 * Task Composition Module
 *
 * Provides utilities for composing multiple tasks into single units.
 * Useful for creating reusable task sequences and conditional branches.
 *
 * @module task-system/task-composition
 */

import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { TaskBuilder } from "#/task-system/task-builder";
import type { GenericWorkflowContext, Task } from "#/task-system/task-types";
import { type FireflyError, timeoutError, unexpectedError } from "#/utils/error";
import { type FireflyAsyncResult, type FireflyResult, failedErrAsync } from "#/utils/result";

/**
 * Composes multiple tasks into a single sequential task.
 *
 * The composed task executes each child task in order, passing the
 * updated context from one task to the next. If any task fails,
 * execution stops and the error propagates.
 *
 * @param id - Unique identifier for the composed task
 * @param tasks - Array of tasks to execute in sequence
 * @returns `Ok(Task)` containing the composed task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * const validationPipeline = composeSequential("validate-all", [
 *   validateConfigTask,
 *   validateSchemaTask,
 *   validatePermissionsTask,
 * ]);
 *
 * if (validationPipeline.isOk()) {
 *   registry.register(validationPipeline.value);
 * }
 * ```
 */
export function composeSequential(id: string, tasks: Task[]): FireflyResult<Task> {
    return TaskBuilder.create(id)
        .description(`Sequential composition: ${tasks.map((t) => t.meta.id).join(" → ")}`)
        .execute(
            (ctx): FireflyAsyncResult<GenericWorkflowContext> =>
                tasks.reduce<FireflyAsyncResult<GenericWorkflowContext>>(
                    (accResult, task) => accResult.andThen((currentCtx) => task.execute(currentCtx)),
                    okAsync(ctx)
                )
        )
        .build();
}

/**
 * Composes a conditional task that branches based on runtime context.
 *
 * Evaluates the condition at execution time and runs either the "then"
 * or "else" task based on the result. If no "else" task is provided and
 * the condition is false, the context passes through unchanged.
 *
 * @param id - Unique identifier for the conditional task
 * @param condition - Function that evaluates to determine which branch to take
 * @param thenTask - Task to execute if condition returns true
 * @param elseTask - Optional task to execute if condition returns false
 * @returns `Ok(Task)` containing the conditional task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * const conditionalPublish = composeConditional(
 *   "publish-if-ready",
 *   (ctx) => ctx.data.isReady,
 *   publishTask,
 *   dryRunTask // Optional fallback
 * );
 * ```
 */
export function composeConditional(
    id: string,
    condition: (ctx: GenericWorkflowContext) => boolean,
    thenTask: Task,
    elseTask?: Task
): FireflyResult<Task> {
    return TaskBuilder.create(id)
        .description(`Conditional: ${thenTask.meta.id} or ${elseTask?.meta.id ?? "skip"}`)
        .execute((ctx) => {
            const shouldExecuteThen = condition(ctx);
            const taskToExecute = shouldExecuteThen ? thenTask : elseTask;
            if (!taskToExecute) {
                return okAsync(ctx);
            }
            return taskToExecute.execute(ctx);
        })
        .build();
}

// ============================================================================
// Parallel Composition
// ============================================================================

/**
 * Options for parallel task composition.
 */
export interface ParallelCompositionOptions {
    /**
     * Strategy for handling task failures.
     * - "fail-fast": Stop on first error, don't wait for other tasks
     * - "collect-all": Wait for all tasks, collect all errors
     * @default "fail-fast"
     */
    readonly failureStrategy?: "fail-fast" | "collect-all";
}

/**
 * Composes multiple independent tasks for parallel execution.
 *
 * **IMPORTANT**: Tasks must be side-effect only (not modify context data).
 * Since tasks run in parallel, context modifications would be lost.
 * The original context is returned after all tasks complete.
 *
 * @param id - Unique identifier for the composed task
 * @param tasks - Array of tasks to execute in parallel
 * @param options - Composition options
 * @returns `Ok(Task)` containing the composed task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * // Parallel notifications (side-effect only)
 * const notifyAll = composeParallel("notify-all", [
 *   notifySlackTask,
 *   notifyEmailTask,
 *   notifyWebhookTask,
 * ]);
 * ```
 */
export function composeParallel(
    id: string,
    tasks: Task[],
    options: ParallelCompositionOptions = {}
): FireflyResult<Task> {
    const { failureStrategy = "fail-fast" } = options;

    return TaskBuilder.create(id)
        .description(`Parallel composition: ${tasks.map((t) => t.meta.id).join(", ")}`)
        .execute((ctx): FireflyAsyncResult<GenericWorkflowContext> => {
            const taskPromises = tasks.map((task) => task.execute(ctx));

            if (failureStrategy === "fail-fast") {
                return ResultAsync.combine(taskPromises).map(() => ctx);
            }

            // collect-all: Execute all and collect errors
            const collectResults = async (): Promise<FireflyResult<GenericWorkflowContext>[]> => {
                const settled: FireflyResult<GenericWorkflowContext>[] = [];
                for (const promise of taskPromises) {
                    const result = await promise;
                    settled.push(result);
                }
                return settled;
            };

            return ResultAsync.fromPromise(collectResults(), (e) => unexpectedError({ message: String(e) })).andThen(
                (results) => {
                    const errors: FireflyError[] = [];
                    for (const result of results) {
                        if (result.isErr()) {
                            errors.push(result.error);
                        }
                    }

                    if (errors.length > 0) {
                        return failedErrAsync({
                            message: `${errors.length} parallel task(s) failed`,
                            details: errors,
                            source: `task-composition/composeParallel/${id}`,
                        });
                    }

                    return okAsync(ctx);
                }
            );
        })
        .build();
}

// ============================================================================
// Retry Composition
// ============================================================================

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (excluding initial attempt) */
    readonly maxAttempts: number;
    /** Delay between retries in milliseconds */
    readonly delayMs: number;
    /**
     * Optional predicate to determine if an error is retryable.
     * If not provided, retries on all errors.
     */
    readonly shouldRetry?: (error: FireflyError) => boolean;
    /**
     * Multiplier for exponential backoff.
     * If provided, delay = delayMs * (backoffMultiplier ^ attemptNumber)
     */
    readonly backoffMultiplier?: number;
}

/**
 * Wraps a task with retry logic.
 *
 * If the task fails, it will be retried according to the provided options.
 * The task's undo function (if any) is not called between retries.
 *
 * @param task - The task to wrap
 * @param options - Retry configuration
 * @returns New task with retry behavior
 *
 * @example
 * ```typescript
 * const reliablePublish = withRetry(publishTask, {
 *   maxAttempts: 3,
 *   delayMs: 1000,
 *   backoffMultiplier: 2, // 1s, 2s, 4s delays
 *   shouldRetry: (err) => err.retryable === true,
 * });
 * ```
 */
export function withRetry(task: Task, options: RetryOptions): Task {
    const { maxAttempts, delayMs, shouldRetry, backoffMultiplier } = options;

    const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

    const executeWithRetry = (
        ctx: GenericWorkflowContext,
        attempt: number
    ): FireflyAsyncResult<GenericWorkflowContext> =>
        task.execute(ctx).orElse((error) => {
            const isRetryable = shouldRetry ? shouldRetry(error) : true;

            if (!isRetryable || attempt >= maxAttempts) {
                return errAsync(error);
            }

            const currentDelay = backoffMultiplier ? delayMs * backoffMultiplier ** attempt : delayMs;

            return ResultAsync.fromPromise(delay(currentDelay), () =>
                unexpectedError({ message: "Delay failed" })
            ).andThen(() => executeWithRetry(ctx, attempt + 1));
        });

    return {
        meta: {
            ...task.meta,
            id: `${task.meta.id}-with-retry`,
            description: `${task.meta.description} (with ${maxAttempts} retries)`,
        },
        shouldSkip: task.shouldSkip,
        execute: (ctx) => executeWithRetry(ctx, 0),
        undo: task.undo,
    };
}

// ============================================================================
// Timeout Composition
// ============================================================================

/**
 * Options for timeout behavior.
 */
export interface TimeoutOptions {
    /** Timeout duration in milliseconds */
    readonly timeoutMs: number;
    /** Custom error message on timeout */
    readonly message?: string;
}

/**
 * Wraps a task with a timeout.
 *
 * If the task doesn't complete within the specified time, it fails
 * with a TIMEOUT error.
 *
 * @param task - The task to wrap
 * @param options - Timeout configuration
 * @returns New task with timeout behavior
 *
 * @example
 * ```typescript
 * const timedTask = withTimeout(longRunningTask, {
 *   timeoutMs: 30000, // 30 seconds
 *   message: "Task took too long to complete",
 * });
 * ```
 */
export function withTimeout(task: Task, options: TimeoutOptions): Task {
    const { timeoutMs, message } = options;

    return {
        meta: {
            ...task.meta,
            id: `${task.meta.id}-with-timeout`,
            description: `${task.meta.description} (timeout: ${timeoutMs}ms)`,
        },
        shouldSkip: task.shouldSkip,
        execute: (ctx) => {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(
                        timeoutError({
                            message: message ?? `Task "${task.meta.id}" timed out after ${timeoutMs}ms`,
                            source: `task-composition/withTimeout/${task.meta.id}`,
                        })
                    );
                }, timeoutMs);
            });

            return ResultAsync.fromPromise(Promise.race([task.execute(ctx), timeoutPromise]), (e) => {
                if (typeof e === "object" && e !== null && "code" in e) {
                    return e as FireflyError;
                }
                return unexpectedError({ message: String(e) });
            }).andThen((result) => {
                if (result.isErr()) {
                    return errAsync(result.error);
                }
                return okAsync(result.value);
            });
        },
        undo: task.undo,
    };
}

// ============================================================================
// Recovery Composition
// ============================================================================

/**
 * Wraps a task with error recovery logic.
 *
 * If the task fails, the recovery function is called to handle the error.
 * The recovery function can either return a context (recovering from error)
 * or propagate a different error.
 *
 * @param task - The task to wrap
 * @param recover - Recovery function called on error
 * @returns New task with recovery behavior
 *
 * @example
 * ```typescript
 * const resilientTask = withRecovery(fetchDataTask, (error, ctx) => {
 *   if (error.code === "NOT_FOUND") {
 *     // Use default data instead
 *     return okAsync(ctx.fork("data", defaultData));
 *   }
 *   // Propagate other errors
 *   return errAsync(error);
 * });
 * ```
 */
export function withRecovery(
    task: Task,
    recover: (error: FireflyError, ctx: GenericWorkflowContext) => FireflyAsyncResult<GenericWorkflowContext>
): Task {
    return {
        meta: {
            ...task.meta,
            id: `${task.meta.id}-with-recovery`,
            description: `${task.meta.description} (with recovery)`,
        },
        shouldSkip: task.shouldSkip,
        execute: (ctx) => task.execute(ctx).orElse((error) => recover(error, ctx)),
        undo: task.undo,
    };
}

// ============================================================================
// Group Composition
// ============================================================================

/**
 * Options for task group composition.
 */
export interface GroupOptions {
    /** Optional shared skip condition for the entire group */
    readonly skipWhen?: (ctx: GenericWorkflowContext) => boolean;
    /** Skip reason shown in logs */
    readonly skipReason?: string;
}

/**
 * Groups multiple tasks with shared skip logic.
 *
 * Creates a logical group where all tasks share a common skip condition.
 * Tasks within the group still execute sequentially.
 *
 * @param id - Unique identifier for the group
 * @param description - Description of the group's purpose
 * @param tasks - Tasks to include in the group
 * @param options - Group options
 * @returns `Ok(Task)` containing the group task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * const validationGroup = composeGroup(
 *   "validation-group",
 *   "All validation tasks",
 *   [validateConfig, validateSchema, validatePermissions],
 *   {
 *     skipWhen: (ctx) => ctx.config.skipValidation,
 *     skipReason: "Validation disabled in config",
 *   }
 * );
 * ```
 */
export function composeGroup(
    id: string,
    description: string,
    tasks: Task[],
    options: GroupOptions = {}
): FireflyResult<Task> {
    let builder = TaskBuilder.create(id)
        .description(description)
        .execute(
            (ctx): FireflyAsyncResult<GenericWorkflowContext> =>
                tasks.reduce<FireflyAsyncResult<GenericWorkflowContext>>(
                    (accResult, task) => accResult.andThen((currentCtx) => task.execute(currentCtx)),
                    okAsync(ctx)
                )
        );

    if (options.skipWhen) {
        builder = builder.skipWhenWithReason(options.skipWhen, options.skipReason ?? "Group skip condition met");
    }

    return builder.build();
}
