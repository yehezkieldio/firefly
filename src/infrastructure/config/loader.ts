import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { ConfigEnricherService } from "#/infrastructure/config/enricher.service";
import { type FireflyConfig, FireflyConfigSchema } from "#/infrastructure/config/schema";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { logger } from "#/shared/utils/logger";

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

export async function configLoader(options: ConfigLoadOptions = {}): Promise<FireflyConfig> {
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

        const packageJsonService = createPackageJsonService(cwd);
        const configEnricher = new ConfigEnricherService(packageJsonService);

        await configEnricher.enrichWithPackageInfo(config.config);

        const validatedConfig = FireflyConfigSchema.parse(config.config);
        return validatedConfig;
    } catch (error) {
        logger.error("Failed to load Firefly configuration:", error);
        throw error;
    }
}
