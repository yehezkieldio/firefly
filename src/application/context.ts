import z from "zod";
import { type CommandName, ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import type { TaskContext } from "#/modules/orchestration/contracts/task.interface";
import { ContextDataSchemas } from "#/modules/orchestration/utils/context-schema.util";

export const ReleaseContextDataSchema = z.object({
    command: z.literal("release"),
    currentVersion: z.string().optional(),
    basePath: z.string().default(process.cwd()),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: ConfigSchemaProvider.get("release").optional(),
});

export type ReleaseContextData = z.infer<typeof ReleaseContextDataSchema>;
export type ReleaseTaskContext = TaskContext<ReleaseContextData>;

ContextDataSchemas["release" satisfies CommandName] = ReleaseContextDataSchema;
