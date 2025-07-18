import { loadConfig } from "c12";
import { colors } from "consola/utils";
import { type FireflyConfig, FireflyConfigSchema } from "#/infrastructure/config/schema";
import { type PackageJson, PackageJsonService } from "#/infrastructure/services/package-json.service";
import { logger } from "#/shared/logger";

const SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
const GITHUB_REPO_REGEX = /github\.com[/:]([\w-]+\/[\w-]+)/;

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

class ConfigEnricher {
    constructor(private packageJsonService: PackageJsonService) {}

    async enrichWithPackageInfo(config: Partial<FireflyConfig>): Promise<void> {
        const packageJson = await this.packageJsonService.read();
        if (!packageJson) return;

        this.enrichName(config, packageJson);
        this.enrichRepository(config, packageJson);
    }

    private enrichName(config: Partial<FireflyConfig>, packageJson: PackageJson): void {
        if (config.name || !packageJson.name) return;

        config.name = packageJson.name.replace(SCOPED_PACKAGE_REGEX, "") || "";

        // Auto-detect scope if name is scoped
        if (typeof packageJson.name === "string" && packageJson.name.startsWith("@") && !config.scope) {
            const parts = packageJson.name.split("/");
            if (parts.length > 0 && typeof parts[0] === "string") {
                config.scope = parts[0].substring(1);
            }
        }
    }

    private enrichRepository(config: Partial<FireflyConfig>, packageJson: PackageJson): void {
        if (config.repository || !packageJson.repository) return;

        if (typeof packageJson.repository === "string") {
            config.repository = packageJson.repository;
        } else if (packageJson.repository.url) {
            const match = packageJson.repository.url.match(GITHUB_REPO_REGEX);
            if (match) {
                config.repository = match[1];
            }
        }
    }
}

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

        const packageJsonReader = new PackageJsonService(cwd);
        const configEnricher = new ConfigEnricher(packageJsonReader);

        await configEnricher.enrichWithPackageInfo(config.config);

        const validatedConfig = FireflyConfigSchema.parse(config.config);

        return validatedConfig;
    } catch (error) {
        logger.error("Failed to load Artemis configuration:", error);
        throw error;
    }
}

// Export FireflyConfig for external use
export type { FireflyConfig } from "./schema";
export { FireflyConfigSchema } from "./schema";
