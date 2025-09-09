import type { z } from "zod";
import { BaseConfigSchema } from "#/modules/configuration/schema/config-base.schema";
import { ReleaseConfigSchema } from "#/modules/configuration/schema/config-release.schema";

const schemas = {
    release: ReleaseConfigSchema,
} as const;

export class ConfigSchemaProvider {
    private static readonly schemas = schemas;

    static base() {
        return BaseConfigSchema;
    }

    static get(command?: CommandName) {
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

    static getEffect<C extends CommandName>(command: C): z.ZodType<BaseConfig & CommandConfigMap[C]>;

    static getEffect(): z.ZodType<BaseConfig & CommandConfigMap[CommandName]>;

    static getEffect(command?: CommandName) {
        if (command) {
            return BaseConfigSchema.and(ConfigSchemaProvider.schemas[command]);
        }

        return Object.values(ConfigSchemaProvider.schemas).reduce(
            (acc, schema) => acc.and(schema),
            BaseConfigSchema as z.ZodType<BaseConfig>,
        );
    }
}

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export type CommandName = keyof typeof schemas;
export type CommandConfigMap = {
    [K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>;
};

export type FinalConfigFor<C extends CommandName> = BaseConfig & CommandConfigMap[C];

export type _FireflyConfig = FinalConfigFor<CommandName>;
