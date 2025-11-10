import { okAsync, type ResultAsync } from "neverthrow";
import { type Task, type WorkflowContext } from "#/rewrite";
import { TaskBuilder } from "./task-builder";
import { FireflyErr, type FireflyAsyncResult } from "#/shared/errors";

export function composeSequential<TConfig, TData>(
    id: string,
    tasks: Task<TConfig, TData>[],
): Task<TConfig, TData> {
    return TaskBuilder.create<TConfig, TData>(id)
        .description(`Sequential composition: ${tasks.map((t) => t.meta.id).join(" → ")}`)
        .execute(async (ctx) => {
            let currentCtx = ctx;
            for (const task of tasks) {
                const result = await task.execute(currentCtx);
                if (result.isErr()) {
                    return result;
                }
                currentCtx = result.value;
            }
            return okAsync(currentCtx);
        })
        .build();
}

export function composeConditional<TConfig, TData>(
    id: string,
    condition: (ctx: WorkflowContext<TConfig, TData>) => boolean,
    thenTask: Task<TConfig, TData>,
    elseTask?: Task<TConfig, TData>,
): Task<TConfig, TData> {
    return TaskBuilder.create<TConfig, TData>(id)
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

export function composeRetry<TConfig, TData>(
    task: Task<TConfig, TData>,
    maxRetries = 3,
    delayMs = 1000,
): Task<TConfig, TData> {
    return TaskBuilder.create<TConfig, TData>(`${task.meta.id}-with-retry`)
        .description(`${task.meta.description} (with retry)`)
        .execute(async (ctx) => {
            let lastError;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const result = await task.execute(ctx);
                if (result.isOk()) {
                    return result;
                }
                lastError = result.error;
                if (attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
                }
            }
            return FireflyErr(`Task failed after ${maxRetries} attempts: ${lastError?.message}`);
        })
        .build();
}

export function composeGroup<TConfig, TData>(
    groupId: string,
    tasks: Task<TConfig, TData>[],
    description?: string,
): Task<TConfig, TData> {
    return composeSequential(groupId, tasks);
}

// Pre-built compositions
export function composePreflightChecks<TConfig extends { skipGit?: boolean }, TData>(): Task<
    TConfig,
    TData
>[] {
    // Return array of tasks that will be used in preflight
    return [];
}

export function composeGitWorkflow<
    TConfig extends { skipGit?: boolean; commitChanges?: boolean; createTag?: boolean; push?: boolean },
    TData,
>(): Task<TConfig, TData>[] {
    // Return array of tasks for git workflow
    return [];
}

export function composeVersionWorkflow<TConfig extends { bumpStrategy?: string }, TData>(): Task<
    TConfig,
    TData
>[] {
    // Return array of tasks for version workflow
    return [];
}
