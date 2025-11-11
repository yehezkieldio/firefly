import type z from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

export interface TaskMetadata {
    readonly id: string;
    readonly description: string;
    readonly dependencies?: string[];
    readonly configSchema?: z.ZodType;
}

export interface TaskSkipCondition {
    shouldSkip: boolean;
    reason?: string;
    skipToTasks?: string[];
}

export type TaskExecutionResult = FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>;

export interface Task {
    readonly metadata: TaskMetadata;
    shouldSkip?: (c: WorkflowContext<unknown, Record<string, unknown>>) => FireflyResult<TaskSkipCondition>;
    execute: (c: WorkflowContext<unknown, Record<string, unknown>>) => TaskExecutionResult;
    undo?: (c: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>;
}

export function createTask(task: Task): Task {
    return task;
}
