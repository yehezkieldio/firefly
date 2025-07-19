import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import type { FireflyConfig } from "#/infrastructure/config";

export class ApplicationContext {
    private readonly config: FireflyConfig;
    private readonly basePath: string;

    private _git?: GitProviderAdapter;

    constructor(config: FireflyConfig, basePath: string = process.cwd()) {
        this.config = config;
        this.basePath = basePath;
    }

    getConfig(): FireflyConfig {
        return this.config;
    }

    getBasePath(): string {
        return this.basePath;
    }

    get git(): GitProviderAdapter {
        if (!this._git) {
            this._git = new GitProviderAdapter();
        }

        return this._git;
    }
}
