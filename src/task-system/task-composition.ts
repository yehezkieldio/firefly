import { okAsync } from "neverthrow";
import { TaskBuilder } from "#/task-system/task-builder";
import type { GenericWorkflowContext, Task } from "#/task-system/task-types";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

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
