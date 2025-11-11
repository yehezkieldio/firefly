import { err, ok } from "neverthrow";
import type z from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import { createFireflyError } from "#/utils/error";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";
import type { Task, TaskExecutionResult, TaskMetadata, TaskSkipCondition } from "./task-types";

export class TaskBuilder {
    private readonly taskId: string;
    private taskDescription?: string;
    private readonly taskDependencies: string[] = [];
    private taskConfigSchema?: z.ZodType;
    private skipFn?: (c: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<TaskSkipCondition>;
    private executeFn?: (c: WorkflowContext<unknown, Record<string, unknown>>) => TaskExecutionResult;
    private undoFn?: (c: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>;

    private constructor(id: string) {
        this.taskId = id;
    }

    static create(id: string): TaskBuilder {
        return new TaskBuilder(id);
    }

    description(desc: string): TaskBuilder {
        this.taskDescription = desc;
        return this;
    }

    dependsOn(taskId: string): TaskBuilder {
        this.taskDependencies.push(taskId);
        return this;
    }

    dependsOnAll(...taskIds: string[]): TaskBuilder {
        this.taskDependencies.push(...taskIds);
        return this;
    }

    withConfigSchema(schema: z.ZodType): TaskBuilder {
        this.taskConfigSchema = schema;
        return this;
    }

    skipWhen(predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
            });
        return this;
    }

    skipWhenWithReason(
        predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean,
        reason: string
    ): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason,
            });
        return this;
    }

    skipWhenAndJumpTo(
        predicate: (context: WorkflowContext<unknown, Record<string, unknown>>) => boolean,
        skipToTasks: string[]
    ): TaskBuilder {
        this.skipFn = (ctx) =>
            ok({
                shouldSkip: predicate(ctx),
                reason: "Skip condition met",
                skipToTasks,
            });
        return this;
    }

    shouldSkip(
        fn: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<TaskSkipCondition>
    ): TaskBuilder {
        this.skipFn = fn;
        return this;
    }

    execute(
        fn: (
            context: WorkflowContext<unknown, Record<string, unknown>>
        ) => FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>
    ): TaskBuilder {
        this.executeFn = fn;
        return this;
    }

    withUndo(
        fn: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>
    ): TaskBuilder {
        this.undoFn = fn;
        return this;
    }

    build(): FireflyResult<Task> {
        if (!this.executeFn) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task "${this.taskId}" must have an execute function`,
                })
            );
        }

        if (!this.taskDescription) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task "${this.taskId}" must have a description`,
                })
            );
        }

        const metadata: TaskMetadata = {
            id: this.taskId,
            description: this.taskDescription,
            ...(this.taskDependencies.length > 0 && { dependencies: this.taskDependencies }),
            ...(this.taskConfigSchema && { configSchema: this.taskConfigSchema }),
        };

        const task: Task = {
            metadata,
            execute: this.executeFn,
            ...(this.skipFn && { shouldSkip: this.skipFn }),
            ...(this.undoFn && { undo: this.undoFn }),
        };

        return ok(task);
    }
}

export function buildTask(id: string): TaskBuilder {
    return TaskBuilder.create(id);
}
