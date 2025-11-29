/**
 * Task Composition Module
 *
 * Provides utilities for composing multiple tasks into single units.
 * Useful for creating reusable task sequences and conditional branches.
 *
 * @module task-system/task-composition
 */

import { okAsync } from "neverthrow";
import { TaskBuilder } from "#/task-system/task-builder";
import type { GenericWorkflowContext, Task } from "#/task-system/task-types";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

/**
 * Composes multiple tasks into a single sequential task.
 *
 * The composed task executes each child task in order, passing the
 * updated context from one task to the next. If any task fails,
 * execution stops and the error propagates.
 *
 * @param id - Unique identifier for the composed task
 * @param tasks - Array of tasks to execute in sequence
 * @returns `Ok(Task)` containing the composed task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * const validationPipeline = composeSequential("validate-all", [
 *   validateConfigTask,
 *   validateSchemaTask,
 *   validatePermissionsTask,
 * ]);
 *
 * if (validationPipeline.isOk()) {
 *   registry.register(validationPipeline.value);
 * }
 * ```
 */
export function composeSequential(id: string, tasks: Task[]): FireflyResult<Task> {
    return TaskBuilder.create(id)
        .description(`Sequential composition: ${tasks.map((t) => t.meta.id).join(" → ")}`)
        .execute(
            (ctx): FireflyAsyncResult<GenericWorkflowContext> =>
                tasks.reduce<FireflyAsyncResult<GenericWorkflowContext>>(
                    (accResult, task) => accResult.andThen((currentCtx) => task.execute(currentCtx)),
                    okAsync(ctx)
                )
        )
        .build();
}

/**
 * Composes a conditional task that branches based on runtime context.
 *
 * Evaluates the condition at execution time and runs either the "then"
 * or "else" task based on the result. If no "else" task is provided and
 * the condition is false, the context passes through unchanged.
 *
 * @param id - Unique identifier for the conditional task
 * @param condition - Function that evaluates to determine which branch to take
 * @param thenTask - Task to execute if condition returns true
 * @param elseTask - Optional task to execute if condition returns false
 * @returns `Ok(Task)` containing the conditional task, or `Err` if build fails
 *
 * @example
 * ```typescript
 * const conditionalPublish = composeConditional(
 *   "publish-if-ready",
 *   (ctx) => ctx.data.isReady,
 *   publishTask,
 *   dryRunTask // Optional fallback
 * );
 * ```
 */
export function composeConditional(
    id: string,
    condition: (ctx: GenericWorkflowContext) => boolean,
    thenTask: Task,
    elseTask?: Task
): FireflyResult<Task> {
    return TaskBuilder.create(id)
        .description(`Conditional: ${thenTask.meta.id} or ${elseTask?.meta.id || "skip"}`)
        .execute((ctx) => {
            const shouldExecuteThen = condition(ctx);
            const taskToExecute = shouldExecuteThen ? thenTask : elseTask;
            if (!taskToExecute) {
                return okAsync(ctx);
            }
            return taskToExecute.execute(ctx);
        })
        .build();
}
