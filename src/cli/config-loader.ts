/**
 * Configuration file loader and resolver.
 *
 * This module handles loading and validating configuration from files
 * (firefly.config.ts, firefly.config.js, etc.) using the c12 library.
 *
 * @internal
 */

import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { colors } from "consola/utils";
import { errAsync, okAsync } from "neverthrow";
import type { z } from "zod";
import type { RuntimeConfig } from "#/cli/internal-types";
import { createFireflyError, toFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, wrapPromise } from "#/utils/result";

/**
 * Options for configuring the ConfigLoader.
 */
export interface ConfigLoaderOptions {
    /** Working directory to search for config files. Defaults to process.cwd(). */
    cwd?: string;
    /** Explicit path to a config file, overriding auto-detection. */
    configFile?: string;
    /** The command being executed, used to extract command-specific config. */
    commandName?: string;
    /** Optional Zod schema to validate the loaded config against. */
    schema?: z.ZodSchema;
}

/**
 * Loads and resolves Firefly configuration from files.
 *
 * Supports multiple config file formats:
 * - firefly.config.ts
 * - firefly.config.js
 * - firefly.config.json
 *
 * Configuration is merged in the following order (later overrides earlier):
 * 1. Default values from schemas
 * 2. Config file values
 * 3. CLI option overrides (handled by commander.ts)
 *
 * @example
 * ```ts
 * const loader = new ConfigLoader({
 *     commandName: "release",
 *     configFile: "./custom.config.ts",
 * });
 *
 * const configResult = await loader.load();
 * if (configResult.isOk()) {
 *     console.log(configResult.value);
 * }
 * ```
 */
export class ConfigLoader {
    constructor(private readonly options: ConfigLoaderOptions = {}) {}

    /**
     * Loads and validates the configuration.
     *
     * @returns Async result containing the merged configuration or an error
     */
    load(): FireflyAsyncResult<RuntimeConfig> {
        const { cwd = process.cwd(), configFile, schema } = this.options;

        return wrapPromise(
            loadConfig<RuntimeConfig>({
                name: "firefly",
                cwd,
                configFile: configFile || "firefly.config",
                packageJson: false,
            })
        ).andThen((result: ResolvedConfig<RuntimeConfig, ConfigLayerMeta>) => {
            this.logConfigFile(result.configFile);
            const finalConfig = this.extractCommandConfig(result.config ?? {});
            return this.validateConfig(finalConfig, schema);
        });
    }

    private logConfigFile(configFile: string | undefined): void {
        if (configFile && configFile !== "firefly.config") {
            logger.info(`Using firefly config: ${colors.underline(configFile)}`);
        }
    }

    /**
     * Extracts command-specific configuration from the full config.
     *
     * If a commandName is specified, this merges the command's nested config
     * (e.g., `release: { ... }`) with the root config.
     */
    private extractCommandConfig(config: RuntimeConfig): RuntimeConfig {
        const commandName = this.options.commandName;

        if (!commandName) {
            return config;
        }

        const commandSpecificConfig = config[commandName];
        const isValidCommandConfig = commandSpecificConfig && typeof commandSpecificConfig === "object";

        if (!isValidCommandConfig) {
            return config;
        }

        const baseConfig = { ...config };
        delete baseConfig[commandName];

        return {
            ...baseConfig,
            ...(commandSpecificConfig as Record<string, unknown>),
        };
    }

    /**
     * Validates the configuration against the provided schema.
     */
    private validateConfig(config: RuntimeConfig, schema?: z.ZodSchema): FireflyAsyncResult<RuntimeConfig> {
        if (!schema) {
            return okAsync(config);
        }

        const validation = schema.safeParse(config);

        if (validation.success) {
            return okAsync(validation.data as RuntimeConfig);
        }

        const errors = this.formatValidationErrors(validation.error.issues);
        logger.error("Config validation failed:");
        logger.error(errors);

        return errAsync(
            createFireflyError(toFireflyError(`Invalid configuration:\n${errors}`, "VALIDATION", "cli/config-loader"))
        );
    }

    private formatValidationErrors(issues: z.core.$ZodIssue[]): string {
        return issues.map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`).join("\n");
    }
}
