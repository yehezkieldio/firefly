import { Result } from "neverthrow";
import { FireflyErrAsync, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { GenericWorkflowContext, Task } from "#/core/task/task.types";

/**
 * Options for creating a side-effect task.
 */
export interface SideEffectTaskOptions<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /**
     * Unique identifier for the task
     */
    readonly id: string;

    /**
     * Human-readable description
     */
    readonly description: string;

    /**
     * IDs of tasks that must complete first
     */
    readonly dependencies?: string[];

    /**
     * The side effect to perform (does not modify context)
     */
    readonly effect: (ctx: TContext) => FireflyAsyncResult<void>;

    /**
     * Optional skip predicate
     */
    readonly skipWhen?: (ctx: TContext) => boolean;

    /**
     * Optional undo function
     */
    readonly undo?: (ctx: TContext) => FireflyAsyncResult<void>;
}

/**
 * Creates a task that performs a side effect without modifying the context.
 *
 * Use this for tasks that perform actions (logging, API calls, file writes)
 * but don't need to pass data to subsequent tasks.
 *
 * @param options - Task configuration
 * @returns `Ok(Task)` if valid, `Err` if configuration is invalid
 *
 * @example
 * ```typescript
 * const logTask = createSideEffectTask({
 *   id: "log-start",
 *   description: "Logs workflow start",
 *   effect: (ctx) => {
 *     logger.info(`Starting workflow for ${ctx.config.name}`);
 *     return okAsync(undefined);
 *   },
 * });
 * ```
 */
export function createSideEffectTask<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    options: SideEffectTaskOptions<TContext>
): FireflyResult<Task> {
    let builder = TaskBuilder.create<TContext>(options.id).description(options.description);

    if (options.dependencies) {
        builder = builder.dependsOnAll(...options.dependencies);
    }

    if (options.skipWhen) {
        builder = builder.skipWhen(options.skipWhen);
    }

    builder = builder.execute((ctx) => options.effect(ctx).map(() => ctx));

    if (options.undo) {
        builder = builder.withUndo(options.undo);
    }

    return builder.build();
}

/**
 * A single validation check with a name and validator function.
 */
export interface ValidationCheck<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /**
     * Human-readable name of the validation
     */
    readonly name: string;

    /**
     * Validation function.
     * Returns `okAsync(undefined)` on success, `errAsync(error)` on failure.
     */
    readonly validate: (ctx: TContext) => FireflyAsyncResult<void>;
}

/**
 * Options for creating a validation task.
 */
export interface ValidationTaskOptions<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /**
     * Unique identifier for the task
     */
    readonly id: string;

    /**
     * Human-readable description
     */
    readonly description: string;

    /**
     * IDs of tasks that must complete first
     */
    readonly dependencies?: string[];

    /**
     * Array of validation checks to run
     */
    readonly validations: readonly ValidationCheck<TContext>[];

    /**
     * Optional skip predicate
     */
    readonly skipWhen?: (ctx: TContext) => boolean;
}

/**
 * Creates a task that runs multiple validation checks in sequence.
 *
 * Each validation is run in order. If any validation fails, the task
 * fails immediately with that error. Context is not modified.
 *
 * @param options - Task configuration with validations
 * @returns `Ok(Task)` if valid, `Err` if configuration is invalid
 *
 * @example
 * ```typescript
 * const validateConfig = createValidationTask({
 *   id: "validate-config",
 *   description: "Validates release configuration",
 *   validations: [
 *     { name: "version format", validate: (ctx) => validateVersionFormat(ctx.config.version) },
 *     { name: "branch allowed", validate: (ctx) => validateBranch(ctx.config.branch) },
 *   ],
 * });
 * ```
 */
export function createValidationTask<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    options: ValidationTaskOptions<TContext>
): FireflyResult<Task> {
    let builder = TaskBuilder.create<TContext>(options.id).description(options.description);

    if (options.dependencies) {
        builder = builder.dependsOnAll(...options.dependencies);
    }

    if (options.skipWhen) {
        builder = builder.skipWhen(options.skipWhen);
    }

    builder = builder.execute((ctx) => {
        const initial: FireflyAsyncResult<void> = FireflyOkAsync(undefined);

        const validationChain = options.validations.reduce(
            (chain, check) => chain.andThen(() => check.validate(ctx)),
            initial
        );

        return validationChain.map(() => ctx);
    });

    return builder.build();
}

/**
 * Options for creating a transform task.
 */
export interface TransformTaskOptions<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /**
     * Unique identifier for the task
     */
    readonly id: string;

    /**
     * Human-readable description
     */
    readonly description: string;

    /**
     * IDs of tasks that must complete first
     */
    readonly dependencies?: string[];

    /**
     * The data key to store the result under
     */
    readonly outputKey: string;

    /**
     * The transformation function
     */
    readonly transform: (ctx: TContext) => FireflyAsyncResult<unknown>;

    /**
     * Optional skip predicate
     */
    readonly skipWhen?: (ctx: TContext) => boolean;

    /**
     * Optional undo function
     */
    readonly undo?: (ctx: TContext) => FireflyAsyncResult<void>;
}

/**
 * Creates a task that computes a value and stores it in the context.
 *
 * Use this for tasks that transform data and need to make the result
 * available to subsequent tasks via the context.
 *
 * @param options - Task configuration with transform function
 * @returns `Ok(Task)` if valid, `Err` if configuration is invalid
 *
 * @example
 * ```typescript
 * const computeVersion = createTransformTask({
 *   id: "compute-version",
 *   description: "Computes the next version number",
 *   outputKey: "nextVersion",
 *   transform: (ctx) => computeNextVersion(ctx.config.bumpType),
 * });
 * ```
 */
export function createTransformTask<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    options: TransformTaskOptions<TContext>
): FireflyResult<Task> {
    let builder = TaskBuilder.create<TContext>(options.id).description(options.description);

    if (options.dependencies) {
        builder = builder.dependsOnAll(...options.dependencies);
    }

    if (options.skipWhen) {
        builder = builder.skipWhen(options.skipWhen);
    }

    builder = builder.execute((ctx) =>
        options.transform(ctx).map((result: unknown) => {
            // Use type assertion since GenericWorkflowContext has Record<string, unknown> as data
            type DataKey = keyof TContext["data"] & string;
            return ctx.fork(options.outputKey as DataKey, result as TContext["data"][DataKey]) as TContext;
        })
    );

    if (options.undo) {
        builder = builder.withUndo(options.undo);
    }

    return builder.build();
}

/**
 * Collects task results from factory functions into a single array.
 *
 * Simplifies the `buildTasks` pattern by handling Result combination
 * and async wrapping automatically.
 *
 * @param factories - Array of task factory functions
 * @returns Combined result of all tasks, or first error encountered
 *
 * @example
 * ```typescript
 * // In a command's buildTasks:
 * buildTasks(context) {
 *   return collectTasks(
 *     () => createPreflightTask(context),
 *     () => createBumpTask(context),
 *     () => createChangelogTask(context),
 *   );
 * }
 * ```
 */
export function collectTasks(...factories: ReadonlyArray<() => FireflyResult<Task>>): FireflyAsyncResult<Task[]> {
    const results = factories.map((factory) => factory());
    const combined = Result.combine(results);

    if (combined.isErr()) {
        return FireflyErrAsync(combined.error);
    }

    return FireflyOkAsync(combined.value);
}

/**
 * Collects tasks conditionally, filtering out disabled tasks.
 *
 * Each entry can be either a factory function or a tuple of [condition, factory].
 * If condition is false, the task is not included.
 *
 * @param entries - Array of factories or [condition, factory] tuples
 * @returns Combined result of enabled tasks
 *
 * @example
 * ```typescript
 * buildTasks(context) {
 *   return collectTasksConditionally(
 *     () => createPreflightTask(context),
 *     [context.config.enableBump, () => createBumpTask(context)],
 *     [context.config.generateChangelog, () => createChangelogTask(context)],
 *   );
 * }
 * ```
 */
export function collectTasksConditionally(
    ...entries: ReadonlyArray<(() => FireflyResult<Task>) | readonly [boolean, () => FireflyResult<Task>]>
): FireflyAsyncResult<Task[]> {
    const factories: Array<() => FireflyResult<Task>> = [];

    for (const entry of entries) {
        if (typeof entry === "function") {
            factories.push(entry);
        } else {
            const [condition, factory] = entry;
            if (condition) {
                factories.push(factory);
            }
        }
    }

    return collectTasks(...factories);
}

/**
 * Runs a sequence of async operations, passing context through each.
 *
 * Useful inside task execute functions to chain multiple operations
 * while maintaining the context flow.
 *
 * @param ctx - Initial context
 * @param operations - Array of async operations
 * @returns Final context after all operations
 *
 * @example
 * ```typescript
 * execute: (ctx) => pipeline(ctx,
 *   (c) => validateStep1(c),
 *   (c) => validateStep2(c),
 *   (c) => okAsync(c.fork("validated", true)),
 * )
 * ```
 */
export function pipeline<TContext extends GenericWorkflowContext>(
    ctx: TContext,
    ...ops: readonly ((c: TContext) => FireflyAsyncResult<TContext>)[]
): FireflyAsyncResult<TContext> {
    return ops.reduce<FireflyAsyncResult<TContext>>((chain, op) => chain.andThen(op), FireflyOkAsync(ctx));
}

/**
 * Runs a sequence of void async operations on the context.
 *
 * Like `pipeline` but for operations that don't modify the context.
 * Context is returned unchanged after all operations complete.
 *
 * @param ctx - Context to pass to operations
 * @param operations - Array of void async operations
 * @returns The original context after all operations complete
 *
 * @example
 * ```typescript
 * execute: (ctx) => runChecks(ctx,
 *   (c) => checkGitStatus(c),
 *   (c) => checkPermissions(c),
 *   (c) => checkDiskSpace(c),
 * )
 * ```
 */
export function runChecks<TContext extends GenericWorkflowContext>(
    ctx: TContext,
    ...checks: readonly ((c: TContext) => FireflyAsyncResult<void>)[]
): FireflyAsyncResult<TContext> {
    const initial: FireflyAsyncResult<void> = FireflyOkAsync(undefined);

    return checks.reduce((chain, check) => chain.andThen(() => check(ctx)), initial).map(() => ctx);
}
