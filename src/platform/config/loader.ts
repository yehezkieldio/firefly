import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ok, ResultAsync } from "neverthrow";
import type { FireflyConfig } from "#/platform/config";
import { FireflyConfigSchema } from "#/platform/config/schema";
import { logger } from "#/shared/logger";
import { ConfigurationError } from "#/shared/utils/error.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

interface RawConfigResult {
    configFile?: string;
    config?: Partial<FireflyConfig>;
}

export class ConfigLoader {
    constructor(private readonly options: ConfigLoadOptions = {}) {}

    /**
     * Loads and validates the Firefly configuration.
     */
    load(): AsyncFireflyResult<FireflyConfig> {
        const { cwd = process.cwd(), configFile, overrides = {} } = this.options;

        return ResultAsync.fromPromise(
            loadConfig<Partial<FireflyConfig>>({
                name: "firefly",
                cwd,
                configFile,
                packageJson: false,
            }),
            (error) => {
                logger.error("Failed to load Firefly configuration:", error);
                return new ConfigurationError(
                    "Failed to load Firefly configuration",
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        )
            .andThen((config) => this.handleConfigLoad(config, overrides))
            .andThen((finalConfig) => this.validateConfig(finalConfig));
    }

    /**
     * Deep merges two configuration objects.
     */
    private deepMerge<T extends Record<string, unknown>>(base: T, overrides: Partial<T>): T {
        const result = { ...base };

        for (const key of Object.keys(overrides) as (keyof T)[]) {
            const baseVal = base[key];
            const overrideVal = overrides[key];

            if (
                baseVal &&
                overrideVal &&
                typeof baseVal === "object" &&
                typeof overrideVal === "object" &&
                !Array.isArray(baseVal) &&
                !Array.isArray(overrideVal)
            ) {
                result[key] = this.deepMerge(
                    baseVal as Record<string, unknown>,
                    overrideVal as Record<string, unknown>
                ) as T[keyof T];
            } else if (overrideVal !== undefined) {
                result[key] = overrideVal as T[keyof T];
            }
        }

        return result;
    }

    /**
     * Merges file config with CLI overrides and validates partial schema.
     */
    private mergeConfig(
        fileConfig: Partial<FireflyConfig>,
        cliOverrides: Partial<FireflyConfig>
    ): Partial<FireflyConfig> {
        const merged = this.deepMerge(fileConfig, cliOverrides);
        return FireflyConfigSchema.partial().parse(merged);
    }

    /**
     * Normalizes optional fields in the configuration.
     */
    private normalizeOptionalFields(config: Partial<FireflyConfig>): Partial<FireflyConfig> {
        return { ...config, name: config.name ?? undefined, scope: config.scope ?? undefined };
    }

    /**
     * Handles raw config from c12, merges overrides, and applies filtering.
     */
    private handleConfigLoad(
        config: RawConfigResult,
        overrides: Partial<FireflyConfig>
    ): FireflyResult<Partial<FireflyConfig>> {
        // we only use firefly.config.ts as the config file, ignoring others
        if (config.configFile !== "firefly.config") {
            logger.info(`Using firefly config: ${colors.underline(config.configFile ?? "unknown")}`);
        }

        const merged = this.mergeConfig(config.config || {}, overrides);
        return ok(this.normalizeOptionalFields(merged));
    }

    /**
     * Validates the final configuration against the full schema.
     */
    private validateConfig(config: Partial<FireflyConfig>): AsyncFireflyResult<FireflyConfig> {
        return ResultAsync.fromPromise(
            Promise.resolve().then(() => FireflyConfigSchema.parse(config)),
            (error) =>
                new ConfigurationError(
                    "Failed to validate Firefly configuration",
                    error instanceof Error ? error : new Error(String(error))
                )
        );
    }
}
