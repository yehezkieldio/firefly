import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { colors } from "consola/utils";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { z } from "zod";
import type { CommandConfig } from "#/cli/types";
import { createFireflyError, toFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

export interface ConfigLoaderOptions {
    cwd?: string;
    configFile?: string;
    commandName?: string;
    schema?: z.ZodSchema;
}

export class ConfigLoader {
    constructor(private readonly options: ConfigLoaderOptions = {}) {}

    load(): FireflyAsyncResult<CommandConfig> {
        const { cwd = process.cwd(), configFile, schema } = this.options;

        return ResultAsync.fromPromise(
            loadConfig<CommandConfig>({
                name: "firefly",
                cwd,
                configFile: configFile || "firefly.config",
                packageJson: false,
            }),
            (error: unknown) => createFireflyError(toFireflyError(error))
        ).andThen((result: ResolvedConfig<CommandConfig, ConfigLayerMeta>) => {
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

    private extractCommandConfig(config: CommandConfig): CommandConfig {
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

    private validateConfig(config: CommandConfig, schema?: z.ZodSchema): FireflyAsyncResult<CommandConfig> {
        if (!schema) {
            return okAsync(config);
        }

        const validation = schema.safeParse(config);

        if (validation.success) {
            return okAsync(validation.data as CommandConfig);
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
