import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ResultAsync, ok } from "neverthrow";
import { type FireflyConfig, FireflyConfigSchema } from "#/infrastructure/config/schema";
import { logger } from "#/shared/utils/logger.util";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

function mergeConfigWithPriority(
    fileConfig: Partial<FireflyConfig>,
    cliOverrides: Partial<FireflyConfig>,
): Partial<FireflyConfig> {
    const merged = { ...fileConfig };

    for (const [key, cliValue] of Object.entries(cliOverrides) as [keyof FireflyConfig, unknown][]) {
        if (cliValue === undefined) {
            continue;
        }

        if (key === "name" || key === "scope") {
            if (typeof cliValue === "string") {
                // Only include if non-empty string or explicitly set to empty string via CLI
                // This preserves the user's intention when they explicitly set --name="" or --scope="" or in the config file
                merged[key] = cliValue;
            }
            continue;
        }

        switch (key) {
            case "base":
            case "repository":
            case "changelogPath":
            case "preReleaseId":
            case "releaseNotes":
            case "commitMessage":
            case "tagName":
            case "releaseTitle":
            case "branch":
                if (typeof cliValue === "string" && cliValue.trim() !== "") {
                    merged[key] = cliValue;
                }
                break;

            case "ci":
            case "verbose":
            case "dryRun":
            case "skipBump":
            case "skipChangelog":
            case "skipCommit":
            case "skipTag":
            case "skipPush":
            case "skipGitHubRelease":
            case "skipGit":
            case "releaseLatest":
            case "releasePreRelease":
            case "releaseDraft":
                if (typeof cliValue === "boolean") {
                    merged[key] = cliValue;
                }
                break;

            case "bumpStrategy":
                if (typeof cliValue === "string" && (cliValue === "auto" || cliValue === "manual")) {
                    merged[key] = cliValue;
                }
                break;

            case "releaseType":
                if (
                    typeof cliValue === "string" &&
                    ["major", "minor", "patch", "prerelease", "premajor", "preminor", "prepatch"].includes(cliValue)
                ) {
                    merged[key] = cliValue as FireflyConfig["releaseType"];
                }
                break;

            case "preReleaseBase":
                if (typeof cliValue === "number" || cliValue === "0" || cliValue === "1") {
                    merged[key] = cliValue;
                }
                break;

            default:
                {
                    const _exhaustive: never = key;
                }
                break;
        }
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
        },
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
                },
            );
        });
}
