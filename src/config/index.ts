import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ConfigEnricher, type ConfigLoadOptions } from "#/config/enricher";
import { type FireflyConfig, FireflyConfigSchema } from "#/config/schema";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { PackageJsonService } from "#/infrastructure/services/package-json.service";
import { logger } from "#/shared/logger";

export async function loadFireflyConfig(options: ConfigLoadOptions = {}): Promise<FireflyConfig> {
    const { cwd = process.cwd(), configFile, overrides = {} } = options;

    try {
        const config = await loadConfig<Partial<FireflyConfig>>({
            name: "firefly",
            cwd,
            configFile,
            packageJson: false,
            defaults: {},
            overrides,
        });

        if (config.configFile !== "firefly.config") {
            const configFileDisplay = config.configFile ?? "unknown";
            logger.info(`Using firefly config: ${colors.underline(configFileDisplay)}`);
        }

        const packageJsonReader = new PackageJsonService(new FileSystemService(cwd));
        const configEnricher = new ConfigEnricher(packageJsonReader);

        await configEnricher.enrichWithPackageInfo(config.config);

        const validatedConfig = FireflyConfigSchema.parse(config.config);

        return validatedConfig;
    } catch (error) {
        logger.error("Failed to load Firefly configuration:", error);
        throw error;
    }
}

// Export FireflyConfig for external use
export type { FireflyConfig } from "./schema";
export { FireflyConfigSchema } from "./schema";
