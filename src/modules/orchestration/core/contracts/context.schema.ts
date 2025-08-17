import { z } from "zod";
import type { CommandName } from "#/modules/configuration/application/config-schema.registry";

/**
 * Base context data that all workflows share
 */
export const BaseContextDataSchema = z.object({
    executionId: z.uuid(),
    startTime: z.date(),
    command: z.enum(["release"]).optional(),
});

export type BaseContextData = z.infer<typeof BaseContextDataSchema>;

/**
 * Context data registry mapping commands to their schemas
 */
export const ContextDataSchemas: Record<CommandName, z.ZodTypeAny> = {} as Record<CommandName, z.ZodTypeAny>;

/**
 * Type helper to get context data type for a specific command
 */
export type ContextDataFor<T extends CommandName> = z.infer<(typeof ContextDataSchemas)[T]> & Record<string, unknown>;

/**
 * Validate that a command has a corresponding context schema
 */
export function hasContextSchema(command: string): command is CommandName {
    return command in ContextDataSchemas;
}

/**
 * Get the schema for a specific command
 */
export function getContextSchema<T extends CommandName>(command: T): (typeof ContextDataSchemas)[T] {
    return ContextDataSchemas[command];
}
