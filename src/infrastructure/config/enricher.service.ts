import type { PackageJson, PackageJsonPort } from "#/core/ports/package-json.port";
import type { FireflyConfig } from "#/infrastructure/config/schema";
import { logger } from "#/shared/utils/logger";

export class ConfigEnricherService {
    private static readonly SCOPED_PACKAGE_REGEX = /^@[^/]+\//;

    constructor(private readonly packageJsonService: PackageJsonPort) {}

    async enrichWithPackageInfo(config: Partial<FireflyConfig>): Promise<Partial<FireflyConfig>> {
        const packageJsonResult = await this.packageJsonService.read();

        if (packageJsonResult.isErr()) {
            logger.warn("Failed to read package.json:", packageJsonResult.error);
            return config;
        }

        if (!packageJsonResult.value) {
            logger.warn("No package.json found.");
            return config;
        }

        return this.enrichName(config, packageJsonResult.value);
    }

    private enrichName(config: Partial<FireflyConfig>, packageJson: PackageJson): Partial<FireflyConfig> {
        if (config.name || !packageJson.name) {
            return config;
        }

        const enrichedConfig = { ...config };
        enrichedConfig.name = this.extractPackageName(packageJson.name);

        // Auto-detect scope if name is scoped and no scope is configured
        if (this.isScopedPackage(packageJson.name) && !config.scope) {
            enrichedConfig.scope = this.extractScope(packageJson.name);
        }

        return enrichedConfig;
    }

    private extractPackageName(packageName: string): string {
        return packageName.replace(ConfigEnricherService.SCOPED_PACKAGE_REGEX, "") || "";
    }

    private isScopedPackage(packageName: string): boolean {
        return packageName.startsWith("@");
    }

    private extractScope(packageName: string): string | undefined {
        const parts = packageName.split("/");
        return parts[0]?.substring(1);
    }
}
