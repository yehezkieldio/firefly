import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "c12";
import { consola } from "consola";
import type { ArtemisConfig } from "./schema.js";
import { ArtemisConfigSchema } from "./schema.js";

// Regex constants to avoid recreation
const SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
const GITHUB_REPO_REGEX = /github\.com[/:]([\w-]+\/[\w-]+)/;

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<ArtemisConfig>;
}

export async function loadArtemisConfig(
    options: ConfigLoadOptions = {}
): Promise<ArtemisConfig> {
    const { cwd = process.cwd(), configFile, overrides = {} } = options;

    try {
        // Load configuration using c12
        const { config: rawConfig } = await loadConfig<Partial<ArtemisConfig>>({
            name: "artemis",
            cwd,
            configFile,
            defaults: {},
            overrides,
        });

        // If no name is provided, try to get it from package.json
        if (!rawConfig.name) {
            try {
                const packageJsonPath = join(cwd, "package.json");
                const packageJson = JSON.parse(
                    readFileSync(packageJsonPath, "utf8")
                );
                rawConfig.name =
                    packageJson.name?.replace(SCOPED_PACKAGE_REGEX, "") || "";

                // Auto-detect scope if name is scoped
                if (packageJson.name?.startsWith("@") && !rawConfig.scope) {
                    rawConfig.scope = packageJson.name
                        .split("/")[0]
                        .substring(1);
                }
            } catch (error) {
                consola.debug("Could not read package.json:", error);
            }
        }

        // If no repository is provided, try to get it from package.json
        if (!rawConfig.repository) {
            try {
                const packageJsonPath = join(cwd, "package.json");
                const packageJson = JSON.parse(
                    readFileSync(packageJsonPath, "utf8")
                );
                if (packageJson.repository) {
                    if (typeof packageJson.repository === "string") {
                        rawConfig.repository = packageJson.repository;
                    } else if (packageJson.repository.url) {
                        // Extract owner/repo from git URL
                        const match =
                            packageJson.repository.url.match(GITHUB_REPO_REGEX);
                        if (match) {
                            rawConfig.repository = match[1];
                        }
                    }
                }
            } catch (error) {
                consola.debug(
                    "Could not extract repository from package.json:",
                    error
                );
            }
        }

        // Validate and parse the configuration
        const validatedConfig = ArtemisConfigSchema.parse(rawConfig);

        consola.debug("Loaded Artemis configuration:", validatedConfig);
        return validatedConfig;
    } catch (error) {
        consola.error("Failed to load Artemis configuration:", error);
        throw error;
    }
}

export type { ArtemisConfig } from "./schema.js";
export { ArtemisConfigSchema } from "./schema.js";
