import type { Changelog } from "#/core/domain/changelog.js";
import type { Version } from "#/core/domain/version.js";
import type { ArtemisResult } from "#/shared/result.js";

export interface IChangelogGenerator {
    /**
     * Generate changelog content from one version to another
     */
    generate(from: Version, to: Version): Promise<ArtemisResult<Changelog>>;

    /**
     * Generate changelog content for unreleased changes
     */
    generateUnreleased(): Promise<ArtemisResult<string>>;

    /**
     * Get the path to the changelog file
     */
    getChangelogPath(): string;

    /**
     * Check if a changelog file exists
     */
    hasChangelogFile(): Promise<boolean>;

    /**
     * Write changelog content to file
     */
    writeChangelog(changelog: Changelog): Promise<ArtemisResult<void>>;
}
