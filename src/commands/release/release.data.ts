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
}
