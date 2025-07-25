/** biome-ignore-all lint/suspicious/noExplicitAny: WIP */
import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ok, ResultAsync } from "neverthrow";
import { type FireflyConfig, FireflyConfigSchema } from "#/infrastructure/config/schema";
import { logger } from "#/shared/utils/logger.util";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

function mergeConfigWithPriority(
    fileConfig: Partial<FireflyConfig>,
    cliOverrides: Partial<FireflyConfig>
): Partial<FireflyConfig> {
    const merged = { ...fileConfig };

    for (const [key, cliValue] of Object.entries(cliOverrides)) {
        if (cliValue === undefined) {
            continue;
        }

        // Special handling for name and scope - only include if they have meaningful values
        if (key === "name" || key === "scope") {
            if (typeof cliValue === "string") {
                // Only include if non-empty string or explicitly set to empty string via CLI
                // This preserves the user's intention when they explicitly set --name="" or --scope="" or in the config file
                merged[key as keyof FireflyConfig] = cliValue as any;
            }
            continue;
        }

        if (typeof cliValue === "string") {
            if (cliValue.trim() !== "") {
                merged[key as keyof FireflyConfig] = cliValue as any;
            }
            continue;
        }

        if (typeof cliValue === "boolean" || typeof cliValue === "number") {
            merged[key as keyof FireflyConfig] = cliValue as any;
            continue;
        }

        merged[key as keyof FireflyConfig] = cliValue as any;
    }

    return merged;
}

function filterConfigBeforeEnrichment(config: Partial<FireflyConfig>): Partial<FireflyConfig> {
    const filtered = { ...config };

    // Remove name and scope if they weren't explicitly provided in config or CLI
    // This allows the enrichment service to properly detect them from package.json
    if (filtered.name === undefined) {
        filtered.name = undefined;
    }

    if (filtered.scope === undefined) {
        filtered.scope = undefined;
    }

    return filtered;
}

export function configLoader(options: ConfigLoadOptions = {}): ResultAsync<FireflyConfig, Error> {
    const { cwd = process.cwd(), configFile, overrides = {} } = options;

    return ResultAsync.fromPromise(
        loadConfig<Partial<FireflyConfig>>({
            name: "firefly",
            cwd,
            configFile,
            packageJson: false,
        }),
        (error) => {
            logger.error("Failed to load Firefly configuration:", error);
            return error instanceof Error ? error : new Error(String(error));
        }
    )
        .andThen((config) => {
            if (config.configFile !== "firefly.config") {
                const configFileDisplay = config.configFile ?? "unknown";
                logger.info(`Using firefly config: ${colors.underline(configFileDisplay)}`);
            }

            const mergedConfig = mergeConfigWithPriority(config.config || {}, overrides);
            const filteredConfig = filterConfigBeforeEnrichment(mergedConfig);

            return ok(filteredConfig);
        })
        .andThen((enrichedConfig) => {
            return ResultAsync.fromPromise(
                Promise.resolve().then(() => FireflyConfigSchema.parse(enrichedConfig)),
                (error) => {
                    return error instanceof Error ? error : new Error("Failed to validate Firefly configuration");
                }
            );
        });
}
