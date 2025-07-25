import { err, ok } from "neverthrow";
import { ConfigEnricherService, type EnrichmentSources } from "#/application/services/config-enricher.service";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { ConfigResolverService, type ConfigTemplateContext } from "#/infrastructure/config/config-resolver.service";
import { type FireflyConfig, FireflyConfigSchema } from "#/infrastructure/config/schema";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { ConfigurationError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class ApplicationContext {
    private config: FireflyConfig;
    private readonly basePath: string;

    private _currentVersion?: string;
    private _nextVersion?: string;
    private _changelogContent?: string;

    constructor(config: FireflyConfig, basePath: string = process.cwd()) {
        this.config = config;
        this.basePath = basePath;
    }

    getConfig(): FireflyConfig {
        return this.config;
    }

    setConfig(config: FireflyConfig): void {
        this.config = config;
    }

    isDryRun(): boolean {
        return this.config.dryRun ?? false;
    }

    getBasePath(): string {
        return this.basePath;
    }

    getCurrentVersion(): string | undefined {
        return this._currentVersion;
    }

    setCurrentVersion(version: string): void {
        this._currentVersion = version;
    }

    getNextVersion(): string | undefined {
        return this._nextVersion;
    }

    setNextVersion(version: string): void {
        this._nextVersion = version;
    }

    getChangelogContent(): string | undefined {
        return this._changelogContent;
    }

    setChangelogContent(content: string): void {
        this._changelogContent = content;
    }

    createTemplateContext(configResolver = new ConfigResolverService()): ConfigTemplateContext {
        const config = this.getConfig();

        return {
            version: this.getNextVersion(),
            name: configResolver.getFullPackageName(config),
            unscopedName: config.name || "",
        };
    }

    createConfigEnricher(): ConfigEnricherService {
        const sources: EnrichmentSources = {
            gitProvider: GitProviderAdapter.getInstance(),
            packageJsonService: createPackageJsonService(this.basePath),
        };

        return new ConfigEnricherService(sources);
    }

    async withEnrichedConfig(): Promise<FireflyResult<void>> {
        const enricher = this.createConfigEnricher();

        const enrichResult = await enricher.enrichConfig(this.config);
        if (enrichResult.isErr()) {
            return err(enrichResult.error);
        }

        const parseResult = FireflyConfigSchema.safeParse(enrichResult.value);
        if (!parseResult.success) {
            return err(new ConfigurationError("Enriched configuration is invalid"));
        }

        this.setConfig(parseResult.data);
        return ok(undefined);
    }
}
