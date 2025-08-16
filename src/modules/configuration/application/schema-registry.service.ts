import type { z } from "zod";
import { BaseConfigSchema } from "#/modules/configuration/core/schema/base.schema";
import { ReleaseConfigSchema } from "#/modules/configuration/core/schema/release.schema";

export class SchemaRegistry {
    static readonly commandSchemas = {
        release: ReleaseConfigSchema,
    } as const;

    static getConfigSchema(command?: CommandName) {
        if (command) {
            const commandSchema = SchemaRegistry.commandSchemas[command];
            return BaseConfigSchema.extend({
                ...commandSchema.shape,
            });
        }

        const mergedShape: z.ZodRawShape = {};
        for (const schema of Object.values(SchemaRegistry.commandSchemas)) {
            Object.assign(mergedShape, schema.shape);
        }

        return BaseConfigSchema.extend(mergedShape);
    }
}

export type CommandName = keyof typeof SchemaRegistry.commandSchemas;

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export type CommandConfigMap = {
    [K in CommandName]: z.infer<(typeof SchemaRegistry.commandSchemas)[K]>;
};

export type FinalConfigFor<C extends CommandName> = BaseConfig & CommandConfigMap[C];

/**
 * __FireflyConfig is the final configuration type for all commands.
 */
export type __FireflyConfig = FinalConfigFor<CommandName>;

/**
 * ReleaseFinalConfig is the final configuration type for the release command.
 */
export type ReleaseFinalConfig = FinalConfigFor<"release">;
