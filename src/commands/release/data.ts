export interface ReleaseData extends Record<string, unknown> {
    currentVersion?: string;
    nextVersion?: string;
    changelogContent?: string;
    /** Selected bump strategy from user prompt (overrides config.bumpStrategy) */
    selectedBumpStrategy?: "auto" | "manual";
    /** Selected release type from user prompt (overrides config.releaseType) */
    selectedReleaseType?: string;
}
