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
 * Context data registry mapping commands to their schemas
 */
export const ContextDataSchemas: Record<CommandName, z.ZodType<unknown, unknown>> = {} as Record<
    CommandName,
    z.ZodType<unknown, unknown>
>;

/**
 * Type helper to get context data type for a specific command
 */
export type ContextDataFor<T extends CommandName> = (typeof ContextDataSchemas)[T] extends z.ZodType<infer O, unknown>
    ? O & Record<string, unknown>
    : Record<string, unknown>;
