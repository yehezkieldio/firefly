import { loadConfig } from "c12";
import {
    type FireflyConfig,
    FireflyConfigSchema,
} from "#/infrastructure/config/schema";
import {
    type PackageJson,
    PackageJsonReader,
} from "#/infrastructure/utils/package-json-reader";
import { logger } from "#/shared/logger";

const SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
const GITHUB_REPO_REGEX = /github\.com[/:]([\w-]+\/[\w-]+)/;

export interface ConfigLoadOptions {
    cwd?: string;
    configFile?: string;
    overrides?: Partial<FireflyConfig>;
}

class ConfigEnricher {
    constructor(private packageJsonReader: PackageJsonReader) {}

    async enrichWithPackageInfo(config: Partial<FireflyConfig>): Promise<void> {
        const packageJson = await this.packageJsonReader.read();
        if (!packageJson) return;

        this.enrichName(config, packageJson);
        this.enrichRepository(config, packageJson);
    }

    private enrichName(
        config: Partial<FireflyConfig>,
        packageJson: PackageJson
    ): void {
        if (config.name || !packageJson.name) return;

        config.name = packageJson.name.replace(SCOPED_PACKAGE_REGEX, "") || "";

        // Auto-detect scope if name is scoped
        if (
            typeof packageJson.name === "string" &&
            packageJson.name.startsWith("@") &&
            !config.scope
        ) {
            const parts = packageJson.name.split("/");
            if (parts.length > 0 && typeof parts[0] === "string") {
                config.scope = parts[0].substring(1);
            }
        }
    }

    private enrichRepository(
        config: Partial<FireflyConfig>,
        packageJson: PackageJson
    ): void {
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

export async function loadFireflyConfig(
    options: ConfigLoadOptions = {}
): Promise<FireflyConfig> {
    const { cwd = process.cwd(), configFile, overrides = {} } = options;

    try {
        const { config: rawConfig } = await loadConfig<Partial<FireflyConfig>>({
            name: "artemis",
            cwd,
            configFile,
            defaults: {},
            overrides,
        });

        const packageJsonReader = new PackageJsonReader(cwd);
        const configEnricher = new ConfigEnricher(packageJsonReader);

        await configEnricher.enrichWithPackageInfo(rawConfig);

        const validatedConfig = FireflyConfigSchema.parse(rawConfig);
        logger.debug("Loaded Firefly configuration:", validatedConfig);

        return validatedConfig;
    } catch (error) {
        logger.error("Failed to load Artemis configuration:", error);
        throw error;
    }
}
