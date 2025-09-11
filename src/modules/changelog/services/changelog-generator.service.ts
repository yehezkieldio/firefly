export interface ChangelogGeneratorOptions {
    dryRun?: boolean;
    releaseNotes?: string;
    changelogPath?: string;
    includePath?: string;
    tagName?: string;
    hasRootDirection?: boolean;
    rootDirection?: string;
    repository?: string;
}

export class ChangelogGeneratorService {}
