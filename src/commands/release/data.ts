export interface ReleaseData extends Record<string, unknown> {
    /**
     * Current version from package.json.
     */
    currentVersion?: string;

    /**
     * Next version to release.
     */
    nextVersion?: string;

    /**
     * Generated changelog content.
     */
    changelogContent?: string;
}
