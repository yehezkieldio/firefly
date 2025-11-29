import type { z } from "zod";
import type { WorkflowContext } from "#/context/workflow-context";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

export interface TaskMetadata {
    readonly id: string;
    readonly description: string;
    readonly dependencies?: string[];
    readonly configSchema?: z.ZodType;
}

export interface SkipCondition {
    shouldSkip: boolean;
    reason?: string;
    skipToTasks?: string[];
}

export type GenericWorkflowContext = WorkflowContext<unknown, Record<string, unknown>, unknown>;

export interface Task {
    readonly meta: TaskMetadata;
    shouldSkip?: (context: GenericWorkflowContext) => FireflyResult<SkipCondition>;
    execute: (context: GenericWorkflowContext) => FireflyAsyncResult<GenericWorkflowContext>;
    undo?: (context: GenericWorkflowContext) => FireflyAsyncResult<void>;
}

export function createTask(task: Task): Task {
    return task;
}
