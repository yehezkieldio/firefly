export interface ReleaseData extends Record<string, unknown> {
    /** Current version read from package.json */
    currentVersion?: string;
    /** Next version to release (computed by bump strategy tasks) */
    nextVersion?: string;
    /** Generated changelog content for this release */
    changelogContent?: string;
    /** Selected bump strategy from user prompt (overrides config.bumpStrategy) */
    selectedBumpStrategy?: "auto" | "manual";
    /** Selected release type from user prompt (overrides config.releaseType) */
    selectedReleaseType?: string;

    // =========================================================================
    // Runtime Options (passed from CLI/orchestrator)
    // =========================================================================

    /** When true, tasks should simulate operations without making actual changes */
    dryRun?: boolean;
}
