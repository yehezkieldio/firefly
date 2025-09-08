import type z from "zod";
import type { CommandName } from "#/modules/configuration/config-schema.provider";

export const ContextDataSchemas: Partial<Record<CommandName, z.ZodType>> = {};

export function registerContextSchema<T extends CommandName>(command: T, schema: z.ZodType): void {
    ContextDataSchemas[command] = schema;
}

export function getContextSchema<T extends CommandName>(command: T): z.ZodType | undefined {
    return ContextDataSchemas[command];
}
