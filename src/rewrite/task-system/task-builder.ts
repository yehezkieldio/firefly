import { ok } from "neverthrow";
import type { z } from "zod";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";
import type { SkipCondition, Task, TaskMetadata } from "#/rewrite/task-system/task-types";

/**
 * Fluent builder for creating tasks with better DX.
 * Provides a chainable API for task configuration.
 */
export class TaskBuilder {
    private taskId: string;
    private taskDescription?: string;
    private taskDependencies: string[] = [];
    private taskConfigSchema?: z.ZodType;
    private skipFn?: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<SkipCondition>;
    private executeFn?: (
        context: WorkflowContext<unknown, Record<string, unknown>>,
    ) => FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>;
    private undoFn?: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>;

    private constructor(id: string) {
        this.taskId = id;
    }

    /**
     * Create a new task builder.
     */
    static create(id: string): TaskBuilder {
        return new TaskBuilder(id);
    }

    /**
     * Set the task description.
     */
    description(desc: string): TaskBuilder {
        this.taskDescription = desc;
        return this;
    }

    /**
     * Add a single dependency.
     */
    dependsOn(taskId: string): TaskBuilder {
        this.taskDependencies.push(taskId);
        return this;
    }

    /**
     * Add multiple dependencies.
     */
    dependsOnAll(...taskIds: string[]): TaskBuilder {
        this.taskDependencies.push(...taskIds);
        return this;
    }

    /**
     * Set the task configuration schema.
     */
    withConfigSchema(schema: z.ZodType): TaskBuilder {
        this.taskConfigSchema = schema;
        return this;
    }

    /**
     * Add skip condition based on predicate.
     */
    skipWhen(predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
            });
        return this;
    }

    /**
     * Add skip condition with custom reason.
     */
    skipWhenWithReason(
        predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean,
        reason: string,
    ): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason,
            });
        return this;
    }

    /**
     * Add skip condition with skip-through.
     */
    skipWhenAndJumpTo(
        predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean,
        skipToTasks: string[],
    ): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
                skipToTasks,
            });
        return this;
    }

    /**
     * Add custom skip function.
     */
    shouldSkip(
        fn: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<SkipCondition>,
    ): TaskBuilder {
        this.skipFn = fn;
        return this;
    }

    /**
     * Set the task execution function.
     */
    execute(
        fn: (
            context: WorkflowContext<unknown, Record<string, unknown>>,
        ) => FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>,
    ): TaskBuilder {
        this.executeFn = fn;
        return this;
    }

    /**
     * Set the undo/rollback function.
     */
    withUndo(fn: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>): TaskBuilder {
        this.undoFn = fn;
        return this;
    }

    /**
     * Build the task.
     */
    build(): Task {
        if (!this.executeFn) {
            throw new Error(`Task "${this.taskId}" must have an execute function`);
        }

        if (!this.taskDescription) {
            throw new Error(`Task "${this.taskId}" must have a description`);
        }

        const meta: TaskMetadata = {
            id: this.taskId,
            description: this.taskDescription,
            dependencies: this.taskDependencies.length > 0 ? this.taskDependencies : undefined,
            configSchema: this.taskConfigSchema,
        };

        return {
            meta,
            shouldSkip: this.skipFn,
            execute: this.executeFn,
            undo: this.undoFn,
        };
    }
}

/**
 * Convenience function for creating a task builder.
 */
export function buildTask(id: string): TaskBuilder {
    return TaskBuilder.create(id);
}
