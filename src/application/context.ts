import { z } from "zod";
import { type CommandName, ConfigSchemaProvider } from "#/modules/configuration/application/config-schema.provider";
import { BaseContextDataSchema, ContextDataSchemas } from "#/modules/orchestration/core/contracts/context-data.schema";

export const ReleaseContextDataSchema = BaseContextDataSchema.extend({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: ConfigSchemaProvider.getFor("release").optional(),
});

export type ReleaseContextData = z.infer<typeof ReleaseContextDataSchema>;

ContextDataSchemas["release" satisfies CommandName] = ReleaseContextDataSchema;
