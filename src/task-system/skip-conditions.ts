/**
 * Skip Conditions Module
 *
 * Provides combinators for composing skip condition predicates.
 * These helpers make it easy to build complex skip logic from simple predicates.
 *
 * @module task-system/skip-conditions
 */

import { ok } from "neverthrow";
import type { GenericWorkflowContext, SkipCondition } from "#/task-system/task-types";
import type { FireflyResult } from "#/utils/result";

// ============================================================================
// Skip Predicate Type
// ============================================================================

/**
 * A predicate function that determines if a task should be skipped.
 */
export type SkipPredicate<TContext extends GenericWorkflowContext = GenericWorkflowContext> = (
    ctx: TContext
) => boolean;

// ============================================================================
// Combinator Functions
// ============================================================================

/**
 * Combines multiple predicates with AND logic.
 *
 * Returns true (skip) only if ALL predicates return true.
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
    return (ctx) => predicates.every((pred) => pred(ctx));
}

/**
 * Combines multiple predicates with OR logic.
 *
 * Returns true (skip) if ANY predicate returns true.
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
    return (ctx) => predicates.some((pred) => pred(ctx));
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
export function fromConfig<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    key: string
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
export function fromData<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    key: string
): SkipPredicate<TContext> {
    return (ctx) => Boolean(ctx.data[key]);
}

/**
 * Creates a predicate that always returns a fixed value.
 *
 * Useful for testing or conditional task inclusion.
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
    return () => value;
}

/**
 * Creates a predicate that never skips.
 *
 * Syntactic sugar for `always(false)`.
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
    return always(false);
}

// ============================================================================
// Skip Condition Builders
// ============================================================================

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
        ok({
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
        ok({
            shouldSkip: predicate(ctx),
            reason: reason ?? "Skip condition met",
            skipToTasks,
        });
}

// ============================================================================
// Namespace Export for Convenient Access
// ============================================================================

/**
 * Namespace containing all skip condition combinators.
 *
 * Provides a convenient way to access all combinators from a single import.
 *
 * @example
 * ```typescript
 * import { skip } from "#/task-system/skip-conditions";
 *
 * TaskBuilder.create("my-task")
 *   .skipWhen(skip.any(
 *     skip.fromConfig("skipValidation"),
 *     skip.fromData("alreadyValidated"),
 *   ))
 * ```
 */
export const skip = {
    all,
    any,
    not,
    fromConfig,
    fromData,
    always,
    never,
    toSkipCondition,
    toSkipConditionWithJump,
} as const;

// ============================================================================
// Group Skip Condition Helpers
// ============================================================================

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
 * import { groupSkipWhen, fromConfig } from "#/task-system/skip-conditions";
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

/**
 * Extended namespace with group skip condition helpers.
 */
export const groupSkip = {
    when: groupSkipWhen,
    whenAny: groupSkipWhenAny,
    whenAll: groupSkipWhenAll,
    // Re-export base combinators for convenience
    fromConfig,
    fromData,
    all,
    any,
    not,
} as const;
