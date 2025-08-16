import type { z } from "zod";
import { BaseConfigSchema } from "#/modules/configuration/core/schema/base.schema";
import { ReleaseConfigSchema } from "#/modules/configuration/core/schema/release.schema";

export const commandSchemas = {
    release: ReleaseConfigSchema,
} as const;

export type CommandName = keyof typeof commandSchemas;

export function getFinalConfigSchema(command: CommandName): z.ZodTypeAny {
    const commandSchema = commandSchemas[command];
    return BaseConfigSchema.extend({
        ...commandSchema.shape,
    });
}

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export type CommandConfigMap = {
    [K in CommandName]: z.infer<(typeof commandSchemas)[K]>;
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
