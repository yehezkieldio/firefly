import type z from "zod";
import { BaseConfigSchema } from "#/modules/configuration/core/schema/config-base.schema";
import { ReleaseConfigSchema } from "#/modules/configuration/core/schema/config-release.schema";

export class ConfigSchemaProvider {
    private static readonly schemas = {
        release: ReleaseConfigSchema,
    } as const;

    /**
     * Get the base configuration schema.
     */
    static getBase() {
        return BaseConfigSchema;
    }

    /**
     * Get the configuration schema for a specific command.
     */
    static getFor(command?: CommandName) {
        if (command) {
            const commandSchema = ConfigSchemaProvider.schemas[command];
            return BaseConfigSchema.extend({
                ...commandSchema.shape,
            });
        }

        const mergedShape: z.ZodRawShape = {};
        for (const schema of Object.values(ConfigSchemaProvider.schemas)) {
            Object.assign(mergedShape, schema.shape);
        }

        return BaseConfigSchema.extend(mergedShape);
    }
}

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export type CommandName = keyof (typeof ConfigSchemaProvider)["schemas"];
export type CommandConfigMap = {
    [K in CommandName]: z.infer<(typeof ConfigSchemaProvider)["schemas"][K]>;
};

export type FinalConfigFor<C extends CommandName> = BaseConfig & CommandConfigMap[C];
