import z from "zod";
import type { Task, TaskContext } from "#/modules/orchestration/core/contracts/task.interface";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

/**
 * Workflow contract for orchestrating task execution.
 */
export interface Workflow<TContext extends TaskContext = TaskContext> {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    buildTasks(context: TContext): FireflyResult<Task[]>;

    beforeExecute?(context: TContext): FireflyAsyncResult<void>;
    afterExecute?(result: WorkflowResult, context: TContext): FireflyAsyncResult<void>;
    onError?(error: FireflyError, context: TContext): FireflyAsyncResult<void>;
}

/**
 * Workflow execution result.
 */
export const WorkflowResultSchema = z.object({
    success: z.boolean(),
    executionId: z.uuid(),
    workflowId: z.string().min(1),

    executedTasks: z.array(z.string()),
    failedTasks: z.array(z.string()),
    skippedTasks: z.array(z.string()),

    error: z.custom<FireflyError>().optional(),
    rollbackExecuted: z.boolean(),
    compensationExecuted: z.boolean(),

    startTime: z.date(),
    endTime: z.date(),
    executionTime: z.number().int().nonnegative(),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
