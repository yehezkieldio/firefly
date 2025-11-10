import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync } from "neverthrow";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";
import type { CommandConfig } from "./types";

/**
 * Options for loading configuration.
 */
export interface ConfigLoaderOptions {
    /**
     * Current working directory.
     */
    cwd?: string;

    /**
     * Path to config file (optional).
     */
    configFile?: string;

    /**
     * Command name for loading command-specific config.
     */
    commandName?: string;
}

/**
 * Loads and merges configuration from file.
 */
export class ConfigLoader {
    constructor(private readonly options: ConfigLoaderOptions = {}) {}

    /**
     * Loads configuration from file using c12.
     */
    load(): FireflyAsyncResult<CommandConfig> {
        const { cwd = process.cwd(), configFile } = this.options;

        return ResultAsync.fromPromise(
            loadConfig<CommandConfig>({
                name: "firefly",
                cwd,
                configFile: configFile || "firefly.config",
                packageJson: false,
            }),
            (error: unknown) => {
                return createFireflyError(toFireflyError(error));
            },
        ).andThen((result: any) => {
            if (result.configFile && result.configFile !== "firefly.config") {
                logger.info(`Using config: ${colors.underline(result.configFile)}`);
            }

            // Extract config for specific command if provided
            const config = result.config || {};

            // If commandName is provided, look for command-specific config
            if (this.options.commandName && config[this.options.commandName]) {
                // Merge base config with command-specific config
                const baseConfig = { ...config };
                delete baseConfig[this.options.commandName];

                const commandSpecificConfig = config[this.options.commandName];

                return ResultAsync.fromSafePromise(
                    Promise.resolve({
                        ...baseConfig,
                        ...commandSpecificConfig,
                    }),
                );
            }

            return ResultAsync.fromSafePromise(Promise.resolve(config));
        });
    }
}
