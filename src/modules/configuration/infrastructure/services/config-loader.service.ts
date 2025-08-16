import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync } from "neverthrow";
import { type CommandName, SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import { type FireflyAsyncResult, type FireflyResult, fireflyOk } from "#/shared/utils/result.util";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
    commandName?: CommandName;
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
    load(): FireflyAsyncResult<FireflyConfig> {
        const { cwd = process.cwd(), configFile, overrides = {} } = this.options;

        return ResultAsync.fromPromise(
            loadConfig<FireflyConfig>({
                name: "firefly",
                cwd,
                configFile,
                packageJson: false,
            }),
            (error) => {
                return createFireflyError(toFireflyError(error));
            },
        )
            .andThen((config) => this.handleConfigLoad(config, overrides))
            .andThen((finalConfig) => this.validateConfig(finalConfig));
    }

    /**
     * Handles raw config from c12, merges overrides, and applies filtering.
     */
    private handleConfigLoad(config: RawConfigResult, overrides: FireflyConfig): FireflyResult<Partial<FireflyConfig>> {
        // we only use firefly.config.* as the config file, ignoring others
        if (config.configFile !== "firefly.config") {
            logger.info(`Using firefly config: ${colors.underline(config.configFile ?? "unknown")}`);
        }

        const merged = this.mergeConfig(config.config || {}, overrides);
        return fireflyOk(this.normalizeOptionalFields(merged));
    }

    /**
     * Validates the final configuration against the full schema.
     */
    private validateConfig(config: FireflyConfig): FireflyAsyncResult<FireflyConfig> {
        return ResultAsync.fromPromise(
            Promise.resolve().then(() => SchemaRegistry.getConfigSchema().parse(config)),
            (error) => createFireflyError(toFireflyError(error)),
        );
    }

    /**
     * Normalizes optional fields in the configuration.
     */
    private normalizeOptionalFields(config: FireflyConfig): FireflyConfig {
        return { ...config, name: config.name ?? undefined, scope: config.scope ?? undefined };
    }

    /**
     * Merges file config with CLI overrides and validates partial schema.
     */
    private mergeConfig(
        fileConfig: Partial<FireflyConfig>,
        cliOverrides: Partial<FireflyConfig>,
    ): Partial<FireflyConfig> {
        const merged = this.deepMerge(fileConfig, cliOverrides);
        return SchemaRegistry.getConfigSchema(this.options.commandName).partial().parse(merged);
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
                    overrideVal as Record<string, unknown>,
                ) as T[keyof T];
            } else if (overrideVal !== undefined) {
                result[key] = overrideVal as T[keyof T];
            }
        }

        return result;
    }
}
