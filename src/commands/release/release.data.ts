/**
 * Configuration fields that can be hydrated from environment (package.json / git).
 */
export interface HydratedConfig {
    repository?: string;
    name?: string;
    scope?: string;
    preReleaseId?: string;
    branch?: string;
}

export interface ReleaseData extends Record<string, unknown> {
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
    selectedBumpStrategy?: "auto" | "manual";

    /**
     * Selected release type from user prompt (overrides config.releaseType)
     */
    selectedReleaseType?: string;

    /**
     * Prepared configuration inferred from environment (package.json / git)
     * Added by the `prepare-release-config` task and consumed by follow-up tasks.
     */
    hydratedConfig?: HydratedConfig;
}
