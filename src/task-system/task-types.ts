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
// Task Metadata
// ============================================================================

/**
 * Metadata describing a task's identity and relationships.
 */
export interface TaskMetadata {
    /** Unique identifier for the task within a workflow */
    readonly id: string;
    /** Human-readable description of what the task does */
    readonly description: string;
    /**
     * IDs of tasks that must complete before this task can execute.
     * Dependencies must be registered before this task.
     */
    readonly dependencies?: string[];
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
    shouldSkip: boolean;
    /** Human-readable reason for skipping (shown in logs) */
    reason?: string;
    /**
     * If provided, skip to these specific tasks instead of continuing sequentially.
     * Useful for conditional branching in workflows.
     */
    skipToTasks?: string[];
}

// ============================================================================
// Context Type Alias
// ============================================================================

/**
 * Generic workflow context type for use in task definitions.
 * Allows tasks to work with any configuration, data, and service types.
 */
export type GenericWorkflowContext = WorkflowContext<unknown, Record<string, unknown>, unknown>;

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
 * const myTask: Task = {
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
 * };
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
    shouldSkip?: (context: GenericWorkflowContext) => FireflyResult<SkipCondition>;

    /**
     * Executes the task's main logic.
     * @param context - Current workflow context
     * @returns Updated context (may include new data) or error
     */
    execute: (context: GenericWorkflowContext) => FireflyAsyncResult<GenericWorkflowContext>;

    /**
     * Optional rollback logic executed when a later task fails.
     * Called in reverse order of execution during rollback.
     * @param context - Workflow context at time of rollback
     */
    undo?: (context: GenericWorkflowContext) => FireflyAsyncResult<void>;
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
