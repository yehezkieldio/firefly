import { ReleaseOrchestrator } from "#/application/release.orchestrator.js";
import type { IChangelogGenerator } from "#/core/ports/changelog.port.js";
import type { IGitProvider } from "#/core/ports/git.port.js";
import type { IHostingProvider } from "#/core/ports/hosting.port.js";
import type { IVersionRepository } from "#/core/ports/version.port.js";
import { ChangelogGeneratorAdapter } from "#/infrastructure/adapters/changelog-generator.adapter.js";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter.js";
import { GitHubProviderAdapter } from "#/infrastructure/adapters/github-provider.adapter.js";
import { VersionRepositoryAdapter } from "#/infrastructure/adapters/version-repository.adapter.js";
import type { ArtemisConfig } from "#/infrastructure/config/index.js";

export class ApplicationContext {
    private readonly config: ArtemisConfig;
    private readonly basePath: string;

    // Adapters
    private _versionRepository?: IVersionRepository;
    private _gitProvider?: IGitProvider;
    private _changelogGenerator?: IChangelogGenerator;
    private _githubProvider?: IHostingProvider;

    // Orchestrator
    private _releaseOrchestrator?: ReleaseOrchestrator;

    constructor(config: ArtemisConfig, basePath: string = process.cwd()) {
        this.config = config;
        this.basePath = basePath;
    }

    get versionRepository(): IVersionRepository {
        if (!this._versionRepository) {
            this._versionRepository = new VersionRepositoryAdapter(
                this.basePath
            );
        }
        return this._versionRepository;
    }

    get gitProvider(): IGitProvider {
        if (!this._gitProvider) {
            this._gitProvider = new GitProviderAdapter(this.basePath);
        }
        return this._gitProvider;
    }

    get changelogGenerator(): IChangelogGenerator {
        if (!this._changelogGenerator) {
            this._changelogGenerator = new ChangelogGeneratorAdapter(
                this.config.changelogPath,
                this.basePath
            );
        }
        return this._changelogGenerator;
    }

    get githubProvider(): IHostingProvider {
        if (!this._githubProvider) {
            // Try to get GitHub token from config, environment, or gh CLI
            const token =
                this.config.githubToken ||
                process.env.GITHUB_TOKEN ||
                process.env.GH_TOKEN;

            this._githubProvider = new GitHubProviderAdapter(
                token,
                this.basePath
            );
        }
        return this._githubProvider;
    }

    get releaseOrchestrator(): ReleaseOrchestrator {
        if (!this._releaseOrchestrator) {
            this._releaseOrchestrator = new ReleaseOrchestrator(
                this.config.dryRun
            );
        }
        return this._releaseOrchestrator;
    }

    getConfig(): ArtemisConfig {
        return this.config;
    }

    getBasePath(): string {
        return this.basePath;
    }
}
