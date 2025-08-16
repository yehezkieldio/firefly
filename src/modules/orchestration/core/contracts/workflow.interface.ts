import z from "zod";
import type { CommandName } from "#/modules/configuration/application/schema-registry.service";
import type { ContextDataFor } from "#/modules/orchestration/core/contracts/context.schema";
import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

/**
 * Workflow contract for orchestrating task execution with command-specific context.
 */
export interface Workflow<TCommand extends CommandName = CommandName> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly command: TCommand;

    buildTasks(context: OrchestrationContext<ContextDataFor<TCommand>, TCommand>): FireflyResult<Task[]>;

    beforeExecute?(context: OrchestrationContext<ContextDataFor<TCommand>, TCommand>): FireflyAsyncResult<void>;
    afterExecute?(
        result: WorkflowResult,
        context: OrchestrationContext<ContextDataFor<TCommand>, TCommand>,
    ): FireflyAsyncResult<void>;
    onError?(
        error: FireflyError,
        context: OrchestrationContext<ContextDataFor<TCommand>, TCommand>,
    ): FireflyAsyncResult<void>;
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
