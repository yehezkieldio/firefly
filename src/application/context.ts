import type { FireflyConfig } from "#/infrastructure/config/schema";

export class ApplicationContext {
    private readonly config: FireflyConfig;
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
}
