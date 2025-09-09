import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync, ok } from "neverthrow";
import { type CommandName, ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import { type FireflyAsyncResult, type FireflyResult, parseSchemaAsync } from "#/shared/utils/result.util";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: FireflyConfig;
    commandName?: CommandName;
}

interface RawConfigResult {
    configFile?: string;
    config?: FireflyConfig;
}

export class ConfigLoaderService {
    constructor(private readonly options: ConfigLoadOptions = {}) {}

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

    private handleConfigLoad(config: RawConfigResult, overrides: FireflyConfig): FireflyResult<FireflyConfig> {
        if (config.configFile !== "firefly.config") {
            logger.info(`Using firefly config: ${colors.underline(config.configFile ?? "unknown")}`);
        }

        const merged = this.mergeConfig(config.config ?? {}, overrides);
        return ok(this.normalizeFields(merged));
    }

    private validateConfig(config: FireflyConfig): FireflyAsyncResult<FireflyConfig> {
        if (!this.options.commandName) {
            return parseSchemaAsync(ConfigSchemaProvider.getEffect(), config);
        }
        return parseSchemaAsync(ConfigSchemaProvider.getEffect(this.options.commandName), config);
    }

    private normalizeFields(config: FireflyConfig): FireflyConfig {
        return {
            ...config,

            /**
             * Normalize nullish optional fields to `undefined` so callers can
             * distinguish "not provided" (auto-detect) from an explicit value
             * (including an empty string).
             *
             * Example:
             * `name === undefined` => infer from package.json;
             * `name === ""` => user explicitly set an empty name.
             */
            name: config.name ?? undefined,
            scope: config.scope ?? undefined,
        };
    }

    private mergeConfig(file: FireflyConfig, cli: FireflyConfig): FireflyConfig {
        return this.deepMerge(file, cli);
    }

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
