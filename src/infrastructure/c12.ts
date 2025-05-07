import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync } from "neverthrow";
import { createDefaultOptions } from "#/application/context";
import type { ArtemisOptions } from "#/infrastructure/config";
import { CWD } from "#/infrastructure/constants";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";

export function createFileConfig(): ResultAsync<ArtemisOptions, Error> {
    return ResultAsync.fromPromise(
        loadConfig<ArtemisOptions>({
            name: "artemis",
            cwd: CWD,
            packageJson: false,
            defaultConfig: createDefaultOptions()
        }),
        (e: unknown): Error => createErrorFromUnknown(e, "Failed to load configuration")
    )

        .andTee((config: ResolvedConfig<ArtemisOptions, ConfigLayerMeta>): void => {
            if (config.configFile !== "artemis.config") {
                logger.info(`Using artemis config: ${colors.underline(config.configFile!)}`);
            }
        })
        .map((config: ResolvedConfig<ArtemisOptions, ConfigLayerMeta>): ArtemisOptions => config.config);
}
