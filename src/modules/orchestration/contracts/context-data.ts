import z from "zod";
import type { CommandName } from "#/modules/configuration/config-schema.provider";

export const BaseContextDataSchema = z.object({
    executionId: z.uuid(),
    startTime: z.date(),

    // TODO: implement a source of truth for commands, but right now release is the only one we have
    command: z.enum(["release"]).optional(),
});

export const ContextDataSchemas: Partial<Record<CommandName, z.ZodType>> = {};

export function registerContextSchema<T extends CommandName>(command: T, schema: z.ZodType): void {
    ContextDataSchemas[command] = schema;
}

export function getContextSchema<T extends CommandName>(command: T): z.ZodType | undefined {
    return ContextDataSchemas[command];
}

export type BaseContextData = z.infer<typeof BaseContextDataSchema>;
export type ContextDataFor<T extends CommandName> = (typeof ContextDataSchemas)[T] extends z.ZodType<infer O>
    ? O & Record<string, unknown>
    : BaseContextData & Record<string, unknown>;
