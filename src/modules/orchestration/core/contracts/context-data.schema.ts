import z from "zod";
import type { CommandName } from "#/modules/configuration/application/config-schema.provider";

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
 * Context data registry mapping commands to their schemas.
 *
 * Use `registerContextSchema` to register schemas,
 * or assign directly to `ContextDataSchemas[command]`.
 */
export const ContextDataSchemas: Partial<Record<CommandName, z.ZodType>> = {};

/**
 * Register a context schema for a command at initialization time.
 */
export function registerContextSchema<T extends CommandName>(command: T, schema: z.ZodType): void {
    ContextDataSchemas[command] = schema;
}

/**
 * Retrieve a registered schema for a command (may be undefined).
 */
export function getContextSchema<T extends CommandName>(command: T): z.ZodType | undefined {
    return ContextDataSchemas[command];
}

/**
 * Type helper to get context data type for a specific command.
 * Falls back to BaseContextData when a command-specific schema cannot be inferred.
 */
export type ContextDataFor<T extends CommandName> = (typeof ContextDataSchemas)[T] extends z.ZodType<infer O>
    ? O & Record<string, unknown>
    : BaseContextData & Record<string, unknown>;
