import type { ReleaseType } from "#/domain/semver/semver.definitions";
import type { BumpStrategy } from "#/domain/semver/semver.strategies";

export interface ReleaseData {
    /**
     * Current version read from package.json
     */
    currentVersion?: string;

    /**
     * Next version to release
     */
    nextVersion?: string;

    /**
     * Generated changelog content for this release
     */
    changelogContent?: string;

    /**
     * Selected bump strategy from user prompt (overrides config.bumpStrategy)
     */
    selectedBumpStrategy?: BumpStrategy;

    /**
     * Selected release type from user prompt (overrides config.releaseType)
     */
    selectedReleaseType?: ReleaseType;
}
