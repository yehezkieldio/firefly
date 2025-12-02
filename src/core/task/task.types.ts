import type z from "zod";
import type { WorkflowContext } from "#/core/context/workflow.context";
import { FireflyOk } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";

/**
 * @example
 * ```typescript
 * const task = {
 *   meta: {
 *     id: "my-task",
 *     description: "Does something",
 *     [TaskSymbols.kind]: "mutation",
 *     [TaskSymbols.phase]: "main",
 *     [TaskSymbols.priority]: 10,
 *   },
 *   execute: (ctx) => okAsync(ctx),
 * };
 */
export const TaskSymbols = {
    /**
     * Categorizes the task by its effect on the system.
     * - `validation`: Checks preconditions without side effects
     * - `mutation`: Modifies state (files, git, etc.)
     * - `notification`: Sends notifications or logs without state changes
     * - `query`: Retrieves information without side effects
     */
    kind: Symbol.for("firefly.task.kind"),

    /**
     * Indicates which phase of the workflow the task belongs to.
     * - `setup`: Initialization and preparation
     * - `main`: Core workflow operations
     * - `cleanup`: Finalization and cleanup
     */
    phase: Symbol.for("firefly.task.phase"),

    /**
     * Numeric priority for execution ordering within the same dependency level.
     * Higher values execute first. Default is 0.
     */
    priority: Symbol.for("firefly.task.priority"),

    /**
     * Indicates if the task can be safely retried on failure.
     */
    retryable: Symbol.for("firefly.task.retryable"),

    /**
     * Maximum number of retry attempts for retryable tasks.
     */
    maxRetries: Symbol.for("firefly.task.maxRetries"),

    /**
     * Timeout in milliseconds for task execution.
     */
    timeout: Symbol.for("firefly.task.timeout"),

    /**
     * Tags for filtering and categorization.
     */
    tags: Symbol.for("firefly.task.tags"),
} as const;

/**
 * Type definitions for task symbol values.
 */
export type TaskKind = "validation" | "mutation" | "notification" | "query";
export type TaskPhase = "setup" | "main" | "cleanup";

/**
 * Metadata interface that includes symbol-based properties.
 */
export interface TaskSymbolMetadata {
    readonly [TaskSymbols.kind]?: TaskKind;
    readonly [TaskSymbols.phase]?: TaskPhase;
    readonly [TaskSymbols.priority]?: number;
    readonly [TaskSymbols.retryable]?: boolean;
    readonly [TaskSymbols.maxRetries]?: number;
    readonly [TaskSymbols.timeout]?: number;
    readonly [TaskSymbols.tags]?: readonly string[];
}

/**
 * Metadata describing a task's identity and relationships.
 * Can be extended with TaskSymbolMetadata for framework-level properties.
 */
export interface TaskMetadata extends TaskSymbolMetadata {
    /**
     * Unique identifier for the task within a workflow
     */
    readonly id: string;

    /**
     * Human-readable description of what the task does
     */
    readonly description: string;

    /**
     * IDs of tasks that must complete before this task can execute.
     * Dependencies must be registered before this task.
     */
    readonly dependencies?: readonly string[];

    /**
     * Optional Zod schema for validating task-specific configuration
     */
    readonly configSchema?: z.ZodType;
}

/**
 * Result of evaluating whether a task should be skipped.
 */
export interface SkipCondition {
    /**
     * Whether the task should be skipped
     */
    readonly shouldSkip: boolean;

    /**
     * Human-readable reason for skipping (shown in logs)
     */
    readonly reason?: string;

    /**
     * If provided, skip to these specific tasks instead of continuing sequentially.
     * Useful for conditional branching in workflows.
     */
    readonly skipToTasks?: readonly string[];
}

/**
 * Generic workflow context type for use in task definitions.
 */
export type GenericWorkflowContext = WorkflowContext<unknown, Record<string, unknown>, unknown>;

/**
 * Type for task skip condition functions.
 * @template TCtx - The workflow context type
 */
export type TaskSkipFn<TCtx extends GenericWorkflowContext = GenericWorkflowContext> = (
    context: TCtx
) => FireflyResult<SkipCondition>;

/**
 * Type for task execute functions.
 * @template TCtx - The workflow context type
 */
export type TaskExecuteFn<TCtx extends GenericWorkflowContext = GenericWorkflowContext> = (
    context: TCtx
) => FireflyAsyncResult<TCtx>;

/**
 * Type for task undo functions.
 * @template TCtx - The workflow context type
 */
export type TaskUndoFn<TCtx extends GenericWorkflowContext = GenericWorkflowContext> = (
    context: TCtx
) => FireflyAsyncResult<void>;

/**
 * A task is an atomic unit of work in a workflow.
 *
 * @example
 * ```typescript
 * const myTask = {
 *   meta: {
 *     id: "validate-config",
 *     description: "Validates the release configuration",
 *   },
 *   shouldSkip: (ctx) => ok({ shouldSkip: ctx.config.skipValidation }),
 *   execute: (ctx) => {
 *     // Perform validation
 *     return okAsync(ctx.fork("validated", true));
 *   },
 *   undo: (ctx) => {
 *     // Rollback if needed
 *     return okAsync(undefined);
 *   },
 * } satisfies Task;
 * ```
 */
export interface Task {
    /** Task metadata including ID, description, and dependencies */
    readonly meta: TaskMetadata;

    /**
     * Evaluates whether this task should be skipped.
     * Called before `execute` to allow dynamic skip decisions.
     * @param context - Current workflow context
     * @returns Skip decision with optional reason and jump targets
     */
    shouldSkip?: TaskSkipFn;

    /**
     * Executes the task's main logic.
     * @param context - Current workflow context
     * @returns Updated context (may include new data) or error
     */
    execute: TaskExecuteFn;

    /**
     * Optional rollback logic executed when a later task fails.
     * Called in reverse order of execution during rollback.
     * @param context - Workflow context at time of rollback
     */
    undo?: TaskUndoFn;
}

/**
 * A typed task with explicit context type parameter.
 * Use this when you need type-safe access to specific config/data/services.
 *
 * @template TCtx - The specific workflow context type
 */
export interface TypedTask<TCtx extends GenericWorkflowContext = GenericWorkflowContext> {
    readonly meta: TaskMetadata;
    shouldSkip?: TaskSkipFn<TCtx>;
    execute: TaskExecuteFn<TCtx>;
    undo?: TaskUndoFn<TCtx>;
}

/**
 * Factory function for creating tasks with type inference.
 *
 * Provides a clean syntax for defining tasks while preserving type safety.
 * Returns a Result for consistency with other factory functions.
 * Prefer using `TaskBuilder` for more complex task definitions with validation.
 *
 * @param task - Task definition
 * @returns `FireflyOk(Task)` containing the task
 *
 * @example
 * ```typescript
 * const taskResult = createTask({
 *   meta: { id: "my-task", description: "Does something" },
 *   execute: (ctx) => okAsync(ctx),
 * });
 *
 * if (taskResult.isOk()) {
 *   registry.register(taskResult.value);
 * }
 * ```
 */
export function createTask(task: Task): FireflyResult<Task> {
    return FireflyOk(task);
}

/**
 * Creates a typed task with explicit context type.
 *
 * @template TCtx - The workflow context type
 * @param task - Typed task definition
 * @returns `FireflyOk(Task)` containing the task cast to base Task type for registry compatibility
 *
 * @example
 * ```typescript
 * const taskResult = createTypedTask<MyContext>({
 *   meta: { id: "typed-task", description: "Type-safe task" },
 *   execute: (ctx) => {
 *     // ctx.config and ctx.data are fully typed
 *     return okAsync(ctx.fork("result", ctx.config.value * 2));
 *   },
 * });
 *
 * if (taskResult.isOk()) {
 *   registry.register(taskResult.value);
 * }
 * ```
 */
export function createTypedTask<TCtx extends GenericWorkflowContext>(task: TypedTask<TCtx>): FireflyResult<Task> {
    return FireflyOk(task as unknown as Task);
}
