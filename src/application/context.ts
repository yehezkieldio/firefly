import { z } from "zod";
import { type CommandName, SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import { BaseContextDataSchema, ContextDataSchemas } from "#/modules/orchestration/core/contracts/context.schema";

export const ReleaseContextDataSchema = BaseContextDataSchema.extend({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: SchemaRegistry.getConfigSchema("release").optional(),
});

export type ReleaseContextData = z.infer<typeof ReleaseContextDataSchema>;

ContextDataSchemas["release" satisfies CommandName] = ReleaseContextDataSchema;
