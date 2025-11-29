import { err, ok } from "neverthrow";
import type { z } from "zod";
import type { GenericWorkflowContext, SkipCondition, Task, TaskMetadata } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

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

    static create<TCtx extends GenericWorkflowContext = GenericWorkflowContext>(id: string): TaskBuilder<TCtx> {
        return new TaskBuilder<TCtx>(id);
    }

    description(desc: string): TaskBuilder<TContext> {
        this.taskDescription = desc;
        return this;
    }

    dependsOn(taskId: string): TaskBuilder<TContext> {
        this.taskDependencies.push(taskId);
        return this;
    }

    dependsOnAll(...taskIds: string[]): TaskBuilder<TContext> {
        this.taskDependencies.push(...taskIds);
        return this;
    }

    withConfigSchema(schema: z.ZodType): TaskBuilder<TContext> {
        this.taskConfigSchema = schema;
        return this;
    }

    skipWhen(predicate: (context: TContext) => boolean): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
            });
        return this;
    }

    skipWhenWithReason(predicate: (context: TContext) => boolean, reason: string): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason,
            });
        return this;
    }

    skipWhenAndJumpTo(predicate: (context: TContext) => boolean, skipToTasks: string[]): TaskBuilder<TContext> {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
                skipToTasks,
            });
        return this;
    }

    shouldSkip(fn: (context: TContext) => FireflyResult<SkipCondition>): TaskBuilder<TContext> {
        this.skipFn = fn;
        return this;
    }

    execute(fn: (context: TContext) => FireflyAsyncResult<TContext>): TaskBuilder<TContext> {
        this.executeFn = fn;
        return this;
    }

    withUndo(fn: (context: TContext) => FireflyAsyncResult<void>): TaskBuilder<TContext> {
        this.undoFn = fn;
        return this;
    }

    build(): FireflyResult<Task> {
        if (!this.executeFn) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task "${this.taskId}" must have an execute function`,
                    source: "task-system/task-builder",
                })
            );
        }

        if (!this.taskDescription) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task "${this.taskId}" must have a description`,
                    source: "task-system/task-builder",
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

export function buildTask<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    id: string
): TaskBuilder<TContext> {
    return TaskBuilder.create<TContext>(id);
}
