import { FireflyOk } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import type { GenericWorkflowContext, SkipCondition } from "#/core/task/task.types";

/**
 * A predicate function that determines if a task should be skipped.
 */
export type SkipPredicate<TContext extends GenericWorkflowContext = GenericWorkflowContext> = (
    ctx: TContext
) => boolean;

/**
 * Creates a memoized version of a skip predicate.
 * Useful for expensive predicates that access the same context multiple times.
 *
 * @param predicate - The predicate to memoize
 * @returns Memoized predicate
 *
 * @example
 * ```typescript
 * const expensiveCheck = memoize((ctx) => {
 *   // Complex computation based on ctx.data
 *   return ctx.data.items.every(item => validate(item));
 * });
 * ```
 */
export function memoize<TContext extends GenericWorkflowContext>(
    predicate: SkipPredicate<TContext>
): SkipPredicate<TContext> {
    const cache = new WeakMap<object, boolean>();

    return (ctx) => {
        const cached = cache.get(ctx);
        if (cached !== undefined) return cached;

        const result = predicate(ctx);
        cache.set(ctx, result);
        return result;
    };
}

/**
 * Combines multiple predicates with AND logic (short-circuit evaluation).
 *
 * Returns true (skip) only if ALL predicates return true.
 * Stops evaluation at first false result for optimal performance.
 *
 * @param predicates - Predicates to combine
 * @returns Combined predicate
 *
 * @example
 * ```typescript
 * const skipWhenAllMet = all(
 *   (ctx) => ctx.config.skipValidation,
 *   (ctx) => ctx.data.isCI,
 * );
 *
 * TaskBuilder.create("my-task")
 *   .skipWhen(skipWhenAllMet)
 * ```
 */
export function all<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    ...predicates: readonly SkipPredicate<TContext>[]
): SkipPredicate<TContext> {
    // Fast path: empty predicates = never skip
    if (predicates.length === 0) return () => false;
    // Fast path: single predicate = return as-is
    const first = predicates[0];
    if (predicates.length === 1 && first) return first;

    return (ctx) => {
        for (const pred of predicates) {
            if (!pred(ctx)) return false; // Short-circuit on first false
        }
        return true;
    };
}

/**
 * Combines multiple predicates with OR logic (short-circuit evaluation).
 *
 * Returns true (skip) if ANY predicate returns true.
 * Stops evaluation at first true result for optimal performance.
 *
 * @param predicates - Predicates to combine
 * @returns Combined predicate
 *
 * @example
 * ```typescript
 * const skipWhenAnyMet = any(
 *   (ctx) => ctx.config.skipValidation,
 *   (ctx) => ctx.data.alreadyValidated,
 * );
 *
 * TaskBuilder.create("my-task")
 *   .skipWhen(skipWhenAnyMet)
 * ```
 */
export function any<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    ...predicates: readonly SkipPredicate<TContext>[]
): SkipPredicate<TContext> {
    // Fast path: empty predicates = never skip
    if (predicates.length === 0) return () => false;
    // Fast path: single predicate = return as-is
    const first = predicates[0];
    if (predicates.length === 1 && first) return first;

    return (ctx) => {
        for (const pred of predicates) {
            if (pred(ctx)) return true; // Short-circuit on first true
        }
        return false;
    };
}

/**
 * Negates a predicate.
 *
 * Returns true (skip) if the predicate returns false.
 * Useful for "skipUnless" semantics.
 *
 * @param predicate - Predicate to negate
 * @returns Negated predicate
 *
 * @example
 * ```typescript
 * // Skip unless config allows this step
 * const skipUnlessAllowed = not((ctx) => ctx.config.allowStep);
 *
 * TaskBuilder.create("my-task")
 *   .skipWhen(skipUnlessAllowed)
 * ```
 */
export function not<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicate: SkipPredicate<TContext>
): SkipPredicate<TContext> {
    return (ctx) => !predicate(ctx);
}

/**
 * Creates a predicate that checks a boolean config property.
 *
 * @param key - The config key to check
 * @returns Predicate that returns the config value
 *
 * @example
 * ```typescript
 * // Skip when config.skipValidation is true
 * TaskBuilder.create("validate")
 *   .skipWhen(fromConfig("skipValidation"))
 * ```
 */
export function fromConfig<TContext extends GenericWorkflowContext = GenericWorkflowContext, K extends string = string>(
    key: K
): SkipPredicate<TContext> {
    return (ctx) => Boolean((ctx.config as Record<string, unknown>)[key]);
}

/**
 * Creates a predicate that checks a boolean data property.
 *
 * @param key - The data key to check
 * @returns Predicate that returns the data value
 *
 * @example
 * ```typescript
 * // Skip when data.alreadyProcessed is true
 * TaskBuilder.create("process")
 *   .skipWhen(fromData("alreadyProcessed"))
 * ```
 */
export function fromData<TContext extends GenericWorkflowContext = GenericWorkflowContext, K extends string = string>(
    key: K
): SkipPredicate<TContext> {
    return (ctx) => Boolean(ctx.data[key]);
}

// Cached always-true and always-false predicates for reuse
const ALWAYS_TRUE: SkipPredicate = () => true;
const ALWAYS_FALSE: SkipPredicate = () => false;

/**
 * Creates a predicate that always returns a fixed value.
 *
 * Useful for testing or conditional task inclusion.
 * Returns cached singleton predicates for true/false.
 *
 * @param value - The fixed boolean value
 * @returns Predicate that always returns the value
 *
 * @example
 * ```typescript
 * // Always skip (for disabled tasks)
 * TaskBuilder.create("disabled-task")
 *   .skipWhen(always(true))
 * ```
 */
export function always<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    value: boolean
): SkipPredicate<TContext> {
    return (value ? ALWAYS_TRUE : ALWAYS_FALSE) as SkipPredicate<TContext>;
}

/**
 * Creates a predicate that never skips.
 *
 * Syntactic sugar for `always(false)`.
 * Returns a cached singleton for optimal memory usage.
 *
 * @returns Predicate that always returns false
 *
 * @example
 * ```typescript
 * TaskBuilder.create("always-run")
 *   .skipWhen(never())
 * ```
 */
export function never<TContext extends GenericWorkflowContext = GenericWorkflowContext>(): SkipPredicate<TContext> {
    return ALWAYS_FALSE as SkipPredicate<TContext>;
}

/**
 * Converts a simple predicate into a full SkipCondition result function.
 *
 * @param predicate - Predicate to convert
 * @param reason - Human-readable reason shown in logs
 * @returns Function returning FireflyResult<SkipCondition>
 *
 * @example
 * ```typescript
 * const skipFn = toSkipCondition(
 *   (ctx) => ctx.config.skipValidation,
 *   "Validation disabled in config"
 * );
 *
 * TaskBuilder.create("validate")
 *   .shouldSkip(skipFn)
 * ```
 */
export function toSkipCondition<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicate: SkipPredicate<TContext>,
    reason: string
): (ctx: TContext) => FireflyResult<SkipCondition> {
    return (ctx) =>
        FireflyOk({
            shouldSkip: predicate(ctx),
            reason,
        });
}

/**
 * Converts a predicate into a SkipCondition with jump targets.
 *
 * When the predicate returns true, the task is skipped and execution
 * jumps to the specified tasks.
 *
 * @param predicate - Predicate to evaluate
 * @param skipToTasks - Task IDs to jump to when skipping
 * @param reason - Optional reason message
 * @returns Function returning FireflyResult<SkipCondition>
 *
 * @example
 * ```typescript
 * const skipAndJump = toSkipConditionWithJump(
 *   (ctx) => ctx.config.fastMode,
 *   ["finalize"],
 *   "Fast mode enabled, skipping to finalize"
 * );
 * ```
 */
export function toSkipConditionWithJump<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicate: SkipPredicate<TContext>,
    skipToTasks: string[],
    reason?: string
): (ctx: TContext) => FireflyResult<SkipCondition> {
    return (ctx) =>
        FireflyOk({
            shouldSkip: predicate(ctx),
            reason: reason ?? "Skip condition met",
            skipToTasks,
        });
}

/**
 * Type alias for group-level skip conditions.
 * Group skip conditions can use the same predicates as task skip conditions.
 */
export type GroupSkipPredicate<TContext extends GenericWorkflowContext = GenericWorkflowContext> =
    SkipPredicate<TContext>;

/**
 * Creates a group skip condition from a simple predicate.
 *
 * Use this to define shared skip logic for all tasks in a group.
 *
 * @param predicate - Predicate that returns true if the group should be skipped
 * @param reason - Human-readable reason shown in logs
 * @returns A function that produces a SkipCondition result
 *
 * @example
 * ```typescript
 * import { groupSkipWhen, fromConfig } from "#/core/task/skip-conditions";
 *
 * const group = buildTaskGroup("git")
 *   .shouldSkip(groupSkipWhen(fromConfig("skipGit"), "Git operations disabled"))
 *   .tasks([...])
 *   .build();
 * ```
 */
export function groupSkipWhen<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicate: SkipPredicate<TContext>,
    reason: string
): (ctx: TContext) => FireflyResult<SkipCondition> {
    return toSkipCondition(predicate, reason);
}

/**
 * Creates a group skip condition that combines multiple predicates with OR logic.
 *
 * The group is skipped if ANY of the predicates return true.
 *
 * @param predicates - Array of predicates to evaluate
 * @param reason - Human-readable reason shown in logs
 * @returns A function that produces a SkipCondition result
 *
 * @example
 * ```typescript
 * const group = buildTaskGroup("git-push")
 *   .shouldSkip(groupSkipWhenAny(
 *     [fromConfig("skipGit"), fromConfig("skipPush")],
 *     "Git push disabled"
 *   ))
 *   .tasks([...])
 *   .build();
 * ```
 */
export function groupSkipWhenAny<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicates: readonly SkipPredicate<TContext>[],
    reason: string
): (ctx: TContext) => FireflyResult<SkipCondition> {
    return toSkipCondition(any(...predicates), reason);
}

/**
 * Creates a group skip condition that combines multiple predicates with AND logic.
 *
 * The group is skipped only if ALL predicates return true.
 *
 * @param predicates - Array of predicates to evaluate
 * @param reason - Human-readable reason shown in logs
 * @returns A function that produces a SkipCondition result
 *
 * @example
 * ```typescript
 * const group = buildTaskGroup("changelog")
 *   .shouldSkip(groupSkipWhenAll(
 *     [fromConfig("skipBump"), fromConfig("skipChangelog")],
 *     "Both bump and changelog disabled"
 *   ))
 *   .tasks([...])
 *   .build();
 * ```
 */
export function groupSkipWhenAll<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    predicates: readonly SkipPredicate<TContext>[],
    reason: string
): (ctx: TContext) => FireflyResult<SkipCondition> {
    return toSkipCondition(all(...predicates), reason);
}
