/**
 * Task Decorators Module
 *
 * Provides middleware-style decorators for adding cross-cutting concerns
 * to tasks, such as logging, timing, and dry-run behavior.
 *
 * @module task-system/task-decorators
 */

import { ok, okAsync } from "neverthrow";
import type { GenericWorkflowContext, SkipCondition, Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

// ============================================================================
// Logging Decorator
// ============================================================================

/**
 * Options for logging behavior.
 */
export interface LoggingOptions {
    /** Whether to log when task starts */
    readonly logStart?: boolean;
    /** Whether to log when task completes */
    readonly logComplete?: boolean;
    /** Whether to log when task is skipped */
    readonly logSkip?: boolean;
    /** Whether to log errors */
    readonly logError?: boolean;
    /** Custom log prefix */
    readonly prefix?: string;
}

const DEFAULT_LOGGING_OPTIONS: Required<LoggingOptions> = {
    logStart: true,
    logComplete: true,
    logSkip: true,
    logError: true,
    prefix: "",
};

/**
 * Wraps a task with logging for lifecycle events.
 *
 * Logs when tasks start, complete, skip, or fail.
 *
 * @param task - The task to wrap
 * @param options - Logging options
 * @returns New task with logging behavior
 *
 * @example
 * ```typescript
 * const loggedTask = withLogging(myTask, {
 *   prefix: "[Release] ",
 *   logStart: true,
 *   logComplete: true,
 * });
 * ```
 */
export function withLogging(task: Task, options: LoggingOptions = {}): Task {
    const opts = { ...DEFAULT_LOGGING_OPTIONS, ...options };
    const prefix = opts.prefix ? `${opts.prefix} ` : "";
    const taskName = task.meta.id;

    const originalShouldSkip = task.shouldSkip;
    const originalUndo = task.undo;

    return {
        meta: task.meta,
        shouldSkip: originalShouldSkip
            ? (ctx) => {
                  const result = originalShouldSkip(ctx);
                  if (result.isOk() && result.value.shouldSkip && opts.logSkip) {
                      const reason = result.value.reason ?? "No reason provided";
                      logger.info(`${prefix}⏭️  Skipping "${taskName}": ${reason}`);
                  }
                  return result;
              }
            : undefined,
        execute: (ctx) => {
            if (opts.logStart) {
                logger.info(`${prefix}▶️  Starting "${taskName}": ${task.meta.description}`);
            }

            return task
                .execute(ctx)
                .map((result) => {
                    if (opts.logComplete) {
                        logger.success(`${prefix}✅ Completed "${taskName}"`);
                    }
                    return result;
                })
                .mapErr((error) => {
                    if (opts.logError) {
                        logger.error(`${prefix}❌ Failed "${taskName}": ${error.message}`);
                    }
                    return error;
                });
        },
        undo: originalUndo
            ? (ctx) => {
                  logger.info(`${prefix}↩️  Rolling back "${taskName}"`);
                  return originalUndo(ctx);
              }
            : undefined,
    };
}

// ============================================================================
// Timing Decorator
// ============================================================================

/**
 * Result of task timing measurement.
 */
export interface TimingResult {
    /** Task ID */
    readonly taskId: string;
    /** Duration in milliseconds */
    readonly durationMs: number;
    /** Whether the task succeeded */
    readonly success: boolean;
}

/**
 * Options for timing behavior.
 */
export interface TimingOptions {
    /** Callback invoked with timing result */
    readonly onComplete?: (result: TimingResult) => void;
    /** Whether to log timing to console */
    readonly logTiming?: boolean;
    /** Warning threshold in milliseconds */
    readonly warnThresholdMs?: number;
}

/**
 * Wraps a task with execution timing.
 *
 * Measures how long task execution takes and optionally logs
 * or reports the timing.
 *
 * @param task - The task to wrap
 * @param options - Timing options
 * @returns New task with timing behavior
 *
 * @example
 * ```typescript
 * const timedTask = withTiming(myTask, {
 *   logTiming: true,
 *   warnThresholdMs: 5000,
 *   onComplete: (result) => metrics.record(result),
 * });
 * ```
 */
export function withTiming(task: Task, options: TimingOptions = {}): Task {
    const { onComplete, logTiming = false, warnThresholdMs } = options;

    return {
        meta: task.meta,
        shouldSkip: task.shouldSkip,
        execute: (ctx) => {
            const startTime = performance.now();

            return task
                .execute(ctx)
                .map((result) => {
                    const durationMs = performance.now() - startTime;
                    const timingResult: TimingResult = {
                        taskId: task.meta.id,
                        durationMs,
                        success: true,
                    };

                    if (logTiming) {
                        const formatted = formatDuration(durationMs);
                        if (warnThresholdMs && durationMs > warnThresholdMs) {
                            logger.warn(
                                `⏱️  Task "${task.meta.id}" took ${formatted} (exceeded ${formatDuration(warnThresholdMs)} threshold)`
                            );
                        } else {
                            logger.info(`⏱️  Task "${task.meta.id}" completed in ${formatted}`);
                        }
                    }

                    onComplete?.(timingResult);
                    return result;
                })
                .mapErr((error) => {
                    const durationMs = performance.now() - startTime;
                    const timingResult: TimingResult = {
                        taskId: task.meta.id,
                        durationMs,
                        success: false,
                    };

                    if (logTiming) {
                        logger.error(`⏱️  Task "${task.meta.id}" failed after ${formatDuration(durationMs)}`);
                    }

                    onComplete?.(timingResult);
                    return error;
                });
        },
        undo: task.undo,
    };
}

// ============================================================================
// Dry Run Decorator
// ============================================================================

/**
 * Options for dry-run behavior.
 */
export interface DryRunOptions {
    /** Whether dry-run mode is enabled */
    readonly enabled: boolean;
    /** Optional custom handler for dry-run mode */
    readonly handler?: (task: Task, ctx: GenericWorkflowContext) => FireflyAsyncResult<GenericWorkflowContext>;
    /** Whether to log dry-run skips */
    readonly logSkip?: boolean;
}

/**
 * Wraps a task with dry-run behavior.
 *
 * When dry-run mode is enabled, the task's execute function is not called.
 * Instead, a log message is printed and the context passes through unchanged.
 *
 * @param task - The task to wrap
 * @param options - Dry-run options
 * @returns New task with dry-run behavior
 *
 * @example
 * ```typescript
 * const dryRunTask = withDryRun(deployTask, {
 *   enabled: config.dryRun,
 *   logSkip: true,
 * });
 * ```
 */
export function withDryRun(task: Task, options: DryRunOptions): Task {
    const { enabled, handler, logSkip = true } = options;

    if (!enabled) {
        return task;
    }

    return {
        meta: {
            ...task.meta,
            description: `[DRY RUN] ${task.meta.description}`,
        },
        shouldSkip: task.shouldSkip,
        execute: (ctx) => {
            if (logSkip) {
                logger.info(`🔸 [DRY RUN] Would execute: "${task.meta.id}" - ${task.meta.description}`);
            }

            if (handler) {
                return handler(task, ctx);
            }

            return okAsync(ctx);
        },
        undo: task.undo
            ? (_ctx) => {
                  if (logSkip) {
                      logger.info(`🔸 [DRY RUN] Would undo: "${task.meta.id}"`);
                  }
                  return okAsync(undefined);
              }
            : undefined,
    };
}

// ============================================================================
// Conditional Decorator
// ============================================================================

/**
 * Wraps a task to only execute when a condition is met.
 *
 * Unlike skipWhen (which is part of the task itself), this decorator
 * can be applied to any existing task without modifying it.
 *
 * @param task - The task to wrap
 * @param condition - Condition that must be true for task to execute
 * @param skipReason - Reason shown when task is skipped
 * @returns New task with conditional execution
 *
 * @example
 * ```typescript
 * const conditionalDeploy = withCondition(
 *   deployTask,
 *   (ctx) => ctx.config.environment === "production",
 *   "Only deploys in production environment"
 * );
 * ```
 */
export function withCondition(
    task: Task,
    condition: (ctx: GenericWorkflowContext) => boolean,
    skipReason: string
): Task {
    return {
        meta: task.meta,
        shouldSkip: (ctx): FireflyResult<SkipCondition> => {
            if (!condition(ctx)) {
                return ok({ shouldSkip: true, reason: skipReason });
            }
            if (task.shouldSkip) {
                return task.shouldSkip(ctx);
            }
            return ok({ shouldSkip: false });
        },
        execute: task.execute,
        undo: task.undo,
    };
}

// ============================================================================
// Compose Decorators
// ============================================================================

/**
 * Type for a task decorator function.
 */
export type TaskDecorator = (task: Task) => Task;

/**
 * Composes multiple decorators into a single decorator.
 *
 * Decorators are applied left-to-right, meaning the first decorator
 * in the list wraps the task first, and subsequent decorators wrap
 * the result.
 *
 * @param decorators - Decorators to compose
 * @returns Combined decorator
 *
 * @example
 * ```typescript
 * const enhance = composeDecorators(
 *   (t) => withLogging(t),
 *   (t) => withTiming(t, { logTiming: true }),
 *   (t) => withDryRun(t, { enabled: isDryRun }),
 * );
 *
 * const enhancedTask = enhance(myTask);
 * ```
 */
export function composeDecorators(...decorators: TaskDecorator[]): TaskDecorator {
    return (task) => decorators.reduce((decorated, decorator) => decorator(decorated), task);
}

/**
 * Applies multiple decorators to a task.
 *
 * Convenience function that applies decorators left-to-right.
 *
 * @param task - Task to decorate
 * @param decorators - Decorators to apply
 * @returns Decorated task
 *
 * @example
 * ```typescript
 * const enhanced = applyDecorators(myTask,
 *   (t) => withLogging(t),
 *   (t) => withTiming(t, { logTiming: true }),
 * );
 * ```
 */
export function applyDecorators(task: Task, ...decorators: TaskDecorator[]): Task {
    return composeDecorators(...decorators)(task);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms.toFixed(0)}ms`;
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(2)}s`;
    }
    const minutes = Math.floor(ms / 60_000);
    const seconds = ((ms % 60_000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
}
