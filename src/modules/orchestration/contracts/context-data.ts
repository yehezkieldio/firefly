import z from "zod";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import type { ContextDataSchemas } from "#/modules/orchestration/utils/context-schema.util";

export const BaseContextDataSchema = z.object({
    executionId: z.uuid(),
    startTime: z.date(),
    command: z.enum(["release"]).optional(),
});

export type BaseContextData = z.infer<typeof BaseContextDataSchema>;
export type ContextDataFor<T extends CommandName> = (typeof ContextDataSchemas)[T] extends z.ZodType<infer O>
    ? O & Record<string, unknown>
    : BaseContextData & Record<string, unknown>;
