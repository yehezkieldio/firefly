/**
 * Task Builder Module
 *
 * Provides a fluent builder API for constructing tasks with validation.
 * Ensures tasks have required properties (description, execute function)
 * before they can be used in a workflow.
 *
 * @module task-system/task-builder
 */

import { err, ok } from "neverthrow";
import type { z } from "zod";
import type { GenericWorkflowContext, SkipCondition, Task, TaskMetadata } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

/**
 * Fluent builder for constructing validated tasks.
 *
 * Provides a chainable API for defining task properties, with compile-time
 * and runtime validation to ensure tasks are properly configured.
 *
 * @template TContext - The workflow context type this task operates on
 *
 * @example
 * ```typescript
 * const taskResult = TaskBuilder.create<MyContext>("validate-input")
 *   .description("Validates user input against schema")
 *   .dependsOn("load-config")
 *   .skipWhen((ctx) => ctx.data.skipValidation)
 *   .execute((ctx) => {
 *     const validated = validateInput(ctx.data.input);
 *     return okAsync(ctx.fork("validatedInput", validated));
 *   })
 *   .withUndo((ctx) => {
 *     logger.info("Rolling back validation");
 *     return okAsync(undefined);
 *   })
 *   .build();
 *
 * if (taskResult.isErr()) {
 *   console.error("Invalid task:", taskResult.error.message);
 * }
 * ```
 */
export class TaskBuilder<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    private readonly taskId: string;
    private taskDescription?: string;
    private readonly taskDependencies: string[] = [];
    private taskConfigSchema?: z.ZodType;
    private skipFn?: (context: TContext) => FireflyResult<SkipCondition>;
    private executeFn?: (context: TContext) => FireflyAsyncResult<TContext>;
    private undoFn?: (context: TContext) => FireflyAsyncResult<void>;

    private constructor(id: string) {
        this.taskId = id;
    }

    /**
     * Creates a new TaskBuilder instance.
     * @template TCtx - The workflow context type
     * @param id - Unique identifier for the task
     */
    static create<TCtx extends GenericWorkflowContext = GenericWorkflowContext>(id: string): TaskBuilder<TCtx> {
        return new TaskBuilder<TCtx>(id);
    }

    /**
     * Sets the task's human-readable description.
     * Required - build() will fail without a description.
     * @param desc - Description of what the task does
     */
    description(desc: string): TaskBuilder<TContext> {
        this.taskDescription = desc;
        return this;
    }

    /**
     * Adds a single dependency on another task.
     * The dependency must be registered before this task.
     * @param taskId - ID of the task this depends on
     */
    dependsOn(taskId: string): TaskBuilder<TContext> {
        this.taskDependencies.push(taskId);
        return this;
    }

    /**
     * Adds multiple dependencies on other tasks.
     * @param taskIds - IDs of tasks this depends on
     */
    dependsOnAll(...taskIds: string[]): TaskBuilder<TContext> {
        this.taskDependencies.push(...taskIds);
        return this;
    }

    /**
     * Sets a Zod schema for configuration validation.
     * @param schema - Zod schema to validate task config against
     */
    withConfigSchema(schema: z.ZodType): TaskBuilder<TContext> {
        this.taskConfigSchema = schema;
        return this;
    }

    /**
     * Sets a simple skip condition based on a boolean predicate.
     * @param predicate - Function returning true if task should be skipped
     */
    skipWhen(predicate: (context: TContext) => boolean): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
            });
        return this;
    }

    /**
     * Sets a skip condition with a custom reason message.
     * @param predicate - Function returning true if task should be skipped
     * @param reason - Human-readable reason shown in logs
     */
    skipWhenWithReason(predicate: (context: TContext) => boolean, reason: string): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason,
            });
        return this;
    }

    /**
     * Sets a skip condition that jumps to specific tasks.
     * @param predicate - Function returning true if task should be skipped
     * @param skipToTasks - Task IDs to jump to when skipping
     */
    skipWhenAndJumpTo(predicate: (context: TContext) => boolean, skipToTasks: string[]): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
                skipToTasks,
            });
        return this;
    }

    /**
     * Sets a custom skip condition with full control over the result.
     * @param fn - Function returning a SkipCondition result
     */
    shouldSkip(fn: (context: TContext) => FireflyResult<SkipCondition>): TaskBuilder<TContext> {
        this.skipFn = fn;
        return this;
    }

    /**
     * Sets the task's execute function.
     * Required - build() will fail without an execute function.
     * @param fn - Async function that performs the task's work
     */
    execute(fn: (context: TContext) => FireflyAsyncResult<TContext>): TaskBuilder<TContext> {
        this.executeFn = fn;
        return this;
    }

    /**
     * Sets an optional undo function for rollback support.
     * Called in reverse order when a later task fails.
     * @param fn - Async function that undoes the task's effects
     */
    withUndo(fn: (context: TContext) => FireflyAsyncResult<void>): TaskBuilder<TContext> {
        this.undoFn = fn;
        return this;
    }

    /**
     * Builds the task, validating that required properties are set.
     * @returns `Ok(Task)` if valid, `Err(FireflyError)` if missing required properties
     */
    build(): FireflyResult<Task> {
        if (!this.executeFn) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task "${this.taskId}" must have an execute function`,
                    source: "TaskBuilder.build",
                })
            );
        }

        if (!this.taskDescription) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task "${this.taskId}" must have a description`,
                    source: "TaskBuilder.build",
                })
            );
        }

        const meta: TaskMetadata = {
            id: this.taskId,
            description: this.taskDescription,
            dependencies: this.taskDependencies.length > 0 ? this.taskDependencies : undefined,
            configSchema: this.taskConfigSchema,
        };

        return ok({
            meta,
            shouldSkip: this.skipFn as unknown as Task["shouldSkip"],
            execute: this.executeFn as unknown as Task["execute"],
            undo: this.undoFn as unknown as Task["undo"],
        });
    }
}

/**
 * Convenience function to create a new TaskBuilder.
 * Equivalent to `TaskBuilder.create(id)`.
 *
 * @template TContext - The workflow context type
 * @param id - Unique identifier for the task
 *
 * @example
 * ```typescript
 * const task = buildTask<MyContext>("my-task")
 *   .description("Does something")
 *   .execute((ctx) => okAsync(ctx))
 *   .build();
 * ```
 */
export function buildTask<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    id: string
): TaskBuilder<TContext> {
    return TaskBuilder.create<TContext>(id);
}
