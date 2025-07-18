import type { FireflyConfig } from "#/config/schema";
import type { PackageJson, PackageJsonService } from "#/infrastructure/services/package-json.service";
import { logger } from "#/shared/logger";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

export class ConfigEnricher {
    private static readonly SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
    constructor(private packageJsonService: PackageJsonService) {}

    async enrichWithPackageInfo(config: Partial<FireflyConfig>): Promise<Partial<FireflyConfig>> {
        const packageJson = await this.packageJsonService.read();

        if (packageJson.isErr()) {
            logger.warn("Failed to read package.json:", packageJson.error);
            return config;
        }

        if (!packageJson.value) {
            logger.warn("No package.json found.");
            return config;
        }

        return this.enrichName(config, packageJson.value);
    }

    private enrichName(config: Partial<FireflyConfig>, packageJson: PackageJson): Partial<FireflyConfig> {
        if (config.name || !packageJson.name) return config;

        const enrichedConfig = { ...config };

        enrichedConfig.name = packageJson.name.replace(ConfigEnricher.SCOPED_PACKAGE_REGEX, "") || "";

        // Auto-detect scope if name is scoped
        if (typeof packageJson.name === "string" && packageJson.name.startsWith("@") && !config.scope) {
            const parts = packageJson.name.split("/");
            if (parts.length > 0 && typeof parts[0] === "string") {
                enrichedConfig.scope = parts[0].substring(1);
            }
        }

        return enrichedConfig;
    }
}
