import z from "zod";
import type { CommandName, FinalConfigFor } from "#/modules/configuration/config-schema.provider";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface OrchestrationContext<TData = Record<string, unknown>, TCommand extends CommandName = CommandName> {
    readonly executionId: string;
    readonly startTime: Date;
    readonly command?: TCommand;
    get<K extends keyof TData>(key: K): FireflyResult<TData[K]>;
    set<K extends keyof TData>(key: K, value: TData[K]): FireflyResult<void>;
    update<K extends keyof TData>(key: K, updater: (current: TData[K] | undefined) => TData[K]): FireflyResult<void>;
    has<K extends keyof TData>(key: K): boolean;
    snapshot(): Readonly<TData>;
    clear(): FireflyResult<void>;
    getConfig(): TCommand extends CommandName ? FinalConfigFor<TCommand> : never;
    setConfig(config: TCommand extends CommandName ? FinalConfigFor<TCommand> : never): FireflyResult<void>;
}

export const RollbackStrategySchema = z.enum([
    "reverse", // Undo tasks in reverse order
    "compensation", // Execute compensating transactions
    "custom", // Use task-specific rollback logic
    "none", // No rollback
]);

export const RollbackEntrySchema = z.object({
    taskId: z.string().min(1),
    taskName: z.string().min(1),
    task: z.custom<Task>(),
    executionTime: z.date(),
    compensationId: z.string().optional(),
});

export const OrchestratorOptionsSchema = z.object({
    executionId: z.uuid().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    dryRun: z.boolean().default(false),
    featureFlags: z.map(z.string(), z.boolean()).optional(),
    rollbackStrategy: RollbackStrategySchema.default("reverse"),
});

export type RollbackStrategy = z.infer<typeof RollbackStrategySchema>;
export type RollbackEntry = z.infer<typeof RollbackEntrySchema>;
export type OrchestratorOptions = z.infer<typeof OrchestratorOptionsSchema>;
