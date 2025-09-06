import z from "zod";
import { type CommandName, ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import { ContextDataSchemas } from "#/modules/orchestration/contracts/context-data";

export const ReleaseContextDataSchema = z.object({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: ConfigSchemaProvider.get("release").optional(),
});

export type ReleaseContextData = z.infer<typeof ReleaseContextDataSchema>;

ContextDataSchemas["release" satisfies CommandName] = ReleaseContextDataSchema;
