import type { ReleaseType } from "#/domain/semver/semver.definitions";
import type { BumpStrategy } from "#/domain/semver/semver.strategies";

/**
 * Configuration fields that can be inferred and hydrated into the release config.
 */
export interface HydratedConfig {
    repository?: string;
    name?: string;
    scope?: string;
    preReleaseId?: string;
    branch?: string;
    releaseLatest?: boolean;
    releasePreRelease?: boolean;
    releaseDraft?: boolean;
}

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

    /**
     * Inferred and hydrated configuration fields
     */
    hydratedConfig?: HydratedConfig;
}
