/**
 * Task System Types Module
 *
 * Defines the core types for the task-based workflow execution system.
 * Tasks are the atomic units of work that can be composed, sequenced,
 * and executed with dependency management and rollback support.
 *
 * @module task-system/task-types
 */

import type { z } from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

// ============================================================================
// Custom Symbols for Task Metadata
// ============================================================================

/**
 * Well-known symbols for task metadata that prevent naming collisions
 * with user-defined metadata keys. Using Symbol.for() creates global symbols
 * that are consistent across module boundaries.
 *
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
 * ```
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
 * Typed metadata interface that includes symbol-based properties.
 * This extends the base TaskMetadata with framework-level metadata.
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

// ============================================================================
// Simplified Type Aliases
// ============================================================================

/** Base constraint for workflow data */
type WorkflowData = Record<string, unknown>;

// ============================================================================
// Task Metadata
// ============================================================================

/**
 * Metadata describing a task's identity and relationships.
 * Can be extended with TaskSymbolMetadata for framework-level properties.
 */
export interface TaskMetadata extends TaskSymbolMetadata {
    /** Unique identifier for the task within a workflow */
    readonly id: string;
    /** Human-readable description of what the task does */
    readonly description: string;
    /**
     * IDs of tasks that must complete before this task can execute.
     * Dependencies must be registered before this task.
     */
    readonly dependencies?: readonly string[];
    /** Optional Zod schema for validating task-specific configuration */
    readonly configSchema?: z.ZodType;
}

// ============================================================================
// Skip Condition
// ============================================================================

/**
 * Result of evaluating whether a task should be skipped.
 */
export interface SkipCondition {
    /** Whether the task should be skipped */
    readonly shouldSkip: boolean;
    /** Human-readable reason for skipping (shown in logs) */
    readonly reason?: string;
    /**
     * If provided, skip to these specific tasks instead of continuing sequentially.
     * Useful for conditional branching in workflows.
     */
    readonly skipToTasks?: readonly string[];
}

// ============================================================================
// Context Type Alias
// ============================================================================

/**
 * Generic workflow context type for use in task definitions.
 * Allows tasks to work with any configuration, data, and service types.
 * Simplified from deep generic nesting.
 */
export type GenericWorkflowContext = WorkflowContext<unknown, WorkflowData, unknown>;

// ============================================================================
// Task Function Types (Simplified)
// ============================================================================

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

// ============================================================================
// Task Interface
// ============================================================================

/**
 * A task is an atomic unit of work in a workflow.
 *
 * Tasks support:
 * - **Metadata**: Identity, description, and dependency declarations
 * - **Skip conditions**: Dynamic evaluation of whether to skip execution
 * - **Execution**: The actual work performed by the task
 * - **Undo**: Optional rollback logic for error recovery
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

// ============================================================================
// Typed Task Interface (for type-safe task creation)
// ============================================================================

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

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Identity function for creating tasks with type inference.
 *
 * Provides a clean syntax for defining tasks while preserving type safety.
 * Prefer using `TaskBuilder` for more complex task definitions.
 *
 * @param task - Task definition
 * @returns The same task (identity function)
 *
 * @example
 * ```typescript
 * const task = createTask({
 *   meta: { id: "my-task", description: "Does something" },
 *   execute: (ctx) => okAsync(ctx),
 * });
 * ```
 */
export function createTask(task: Task): Task {
    return task;
}

/**
 * Creates a typed task with explicit context type.
 * Provides full type safety for config, data, and services access.
 *
 * @template TCtx - The workflow context type
 * @param task - Typed task definition
 * @returns The task cast to base Task type for registry compatibility
 *
 * @example
 * ```typescript
 * const task = createTypedTask<MyContext>({
 *   meta: { id: "typed-task", description: "Type-safe task" },
 *   execute: (ctx) => {
 *     // ctx.config and ctx.data are fully typed
 *     return okAsync(ctx.fork("result", ctx.config.value * 2));
 *   },
 * });
 * ```
 */
export function createTypedTask<TCtx extends GenericWorkflowContext>(task: TypedTask<TCtx>): Task {
    return task as unknown as Task;
}
