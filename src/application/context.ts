import type { FireflyConfig } from "#/infrastructure/config";

export class ApplicationContext {
    private readonly config: FireflyConfig;
    private readonly basePath: string;

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
}
