import type { z } from "zod";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

/**
 * Task metadata for registration and discovery.
 */
export interface TaskMetadata {
    /**
     * Unique task identifier.
     */
    readonly id: string;

    /**
     * Human-readable description.
     */
    readonly description: string;

    /**
     * Task IDs that must execute before this task.
     * These are static dependencies defined at registration time.
     */
    readonly dependencies?: string[];

    /**
     * Optional schema for task-specific configuration validation.
     */
    readonly configSchema?: z.ZodType;
}

/**
 * Task skip condition result.
 */
export interface SkipCondition {
    /**
     * Whether to skip this task.
     */
    shouldSkip: boolean;

    /**
     * Optional reason for skipping.
     */
    reason?: string;

    /**
     * Tasks to skip through to (continue from).
     * If provided, execution jumps to these tasks after skipping.
     */
    skipToTasks?: string[];
}

/**
 * Simplified task interface.
 * Tasks are functions with metadata, not classes.
 */
export interface Task {
    /**
     * Task metadata.
     */
    readonly meta: TaskMetadata;

    /**
     * Check if this task should be skipped based on context.
     * Called before execute().
     */
    shouldSkip?: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<SkipCondition>;

    /**
     * Execute the task.
     * Returns a new context (via fork) with any updates.
     */
    execute: (
        context: WorkflowContext<unknown, Record<string, unknown>>,
    ) => FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>;

    /**
     * Undo/rollback this task if execution fails later.
     * Optional - not all tasks can be rolled back.
     */
    undo?: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>;
}

/**
 * Helper to create a task with type inference.
 */
export function createTask(task: Task): Task {
    return task;
}
