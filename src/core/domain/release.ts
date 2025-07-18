import type { Changelog } from "./changelog.js";
import type { Version } from "./version.js";

export interface ReleaseOptions {
    title?: string;
    notes?: string;
    isDraft?: boolean;
    isPrerelease?: boolean;
    isLatest?: boolean;
    tagName?: string;
    commitMessage?: string;
    branch?: string;
}

export class Release {
    readonly currentVersion: Version;
    readonly nextVersion: Version;
    readonly changelog?: Changelog;
    readonly title: string;
    readonly notes: string;
    readonly isDraft: boolean;
    readonly isPrerelease: boolean;
    readonly isLatest: boolean;
    readonly tagName: string;
    readonly commitMessage: string;
    readonly branch: string;

    constructor(
        currentVersion: Version,
        nextVersion: Version,
        options: ReleaseOptions = {},
        changelog?: Changelog
    ) {
        this.currentVersion = currentVersion;
        this.nextVersion = nextVersion;
        this.changelog = changelog;
        this.title = options.title || `${nextVersion.toString()}`;
        this.notes = options.notes || "";
        this.isDraft = options.isDraft ?? false;
        this.isPrerelease = options.isPrerelease || nextVersion.isPrerelease();
        this.isLatest = options.isLatest || !this.isPrerelease;
        this.tagName = options.tagName || `v${nextVersion.toString()}`;
        this.commitMessage =
            options.commitMessage ||
            `chore(release): ${nextVersion.toString()}`;
        this.branch = options.branch || "main";
    }

    hasVersionChanged(): boolean {
        return !this.currentVersion.isEqualTo(this.nextVersion);
    }

    getReleaseNotes(): string {
        if (this.notes) {
            return this.notes;
        }

        if (this.changelog) {
            return this.changelog.getLatestEntryContent();
        }

        return `Release ${this.nextVersion.toString()}`;
    }

    getFormattedTitle(): string {
        return this.title.replace(/{{version}}/g, this.nextVersion.toString());
    }

    getFormattedTagName(): string {
        return this.tagName.replace(
            /{{version}}/g,
            this.nextVersion.toString()
        );
    }

    getFormattedCommitMessage(): string {
        return this.commitMessage.replace(
            /{{version}}/g,
            this.nextVersion.toString()
        );
    }
}
