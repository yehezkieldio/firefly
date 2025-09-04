import z from "zod";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import type { ContextDataFor } from "#/modules/orchestration/contracts/context-data";
import type { OrchestrationContext } from "#/modules/orchestration/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

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

type WorkflowContext<T extends CommandName> = OrchestrationContext<ContextDataFor<T>, T>;

export interface Workflow<TCommand extends CommandName = CommandName> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly command: TCommand;
    buildTasks(context: WorkflowContext<TCommand>): FireflyResult<Task[]>;
    beforeExecute?(context: WorkflowContext<TCommand>): FireflyAsyncResult<void>;
    afterExecute?(result: WorkflowResult, context: WorkflowContext<TCommand>): FireflyAsyncResult<void>;
    onError?(error: FireflyError, context: WorkflowContext<TCommand>): FireflyAsyncResult<void>;
}
