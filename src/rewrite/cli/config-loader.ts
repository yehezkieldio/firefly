import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
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

    /**
     * Zod schema for validation (optional).
     */
    schema?: z.ZodSchema;
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
        const { cwd = process.cwd(), configFile, schema } = this.options;

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
            let finalConfig = config;
            if (this.options.commandName && config[this.options.commandName]) {
                // Merge base config with command-specific config
                const baseConfig = { ...config };
                delete baseConfig[this.options.commandName];

                const commandSpecificConfig = config[this.options.commandName];

                finalConfig = {
                    ...baseConfig,
                    ...commandSpecificConfig,
                };
            }

            // Validate config against schema if provided
            if (schema) {
                const validation = schema.safeParse(finalConfig);
                if (!validation.success) {
                    const errors = validation.error.errors
                        .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
                        .join("\n");
                    
                    logger.error("Config validation failed:");
                    logger.error(errors);
                    
                    return errAsync(
                        createFireflyError(
                            toFireflyError(`Invalid configuration:\n${errors}`),
                        ),
                    );
                }
                return ResultAsync.fromSafePromise(Promise.resolve(validation.data));
            }

            return ResultAsync.fromSafePromise(Promise.resolve(finalConfig));
        });
    }
}
