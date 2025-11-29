export interface ReleaseData extends Record<string, unknown> {
    currentVersion?: string;
    nextVersion?: string;
    changelogContent?: string;
}
