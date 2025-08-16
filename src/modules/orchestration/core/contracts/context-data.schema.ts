import { z } from "zod";
import { type CommandName, SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";

/**
 * Base context data that all workflows share
 */
export const BaseContextDataSchema = z.object({
    executionId: z.uuid(),
    startTime: z.date(),
    command: z.enum(["release"]).optional(),
});

/**
 * Release-specific context data
 */
export const ReleaseContextDataSchema = BaseContextDataSchema.extend({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: SchemaRegistry.getConfigSchema("release").optional(),
});

/**
 * Context data registry mapping commands to their schemas
 */
export const ContextDataSchemas = {
    release: ReleaseContextDataSchema,
} as const;

// Type definitions
export type BaseContextData = z.infer<typeof BaseContextDataSchema>;
export type ReleaseContextData = z.infer<typeof ReleaseContextDataSchema>;

/**
 * Type helper to get context data type for a specific command
 */
export type ContextDataFor<T extends CommandName> = z.infer<
    T extends keyof typeof ContextDataSchemas ? (typeof ContextDataSchemas)[T] : never
>;

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
    const schema = ContextDataSchemas[command];
    if (!schema) {
        // This should never happen due to type constraints, but TypeScript requires exhaustive handling
        return ContextDataSchemas.release as (typeof ContextDataSchemas)[T];
    }
    return schema;
}
