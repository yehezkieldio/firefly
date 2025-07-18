import type { Version } from "./version.js";

export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: Date;
    body?: string;
    breaking?: boolean;
    type?: string;
    scope?: string;
}

export interface ChangelogEntry {
    version: Version;
    date: Date;
    title: string;
    content: string;
    commits: CommitInfo[];
}

export class Changelog {
    readonly entries: ChangelogEntry[];
    readonly path: string;

    constructor(path: string, entries: ChangelogEntry[] = []) {
        this.path = path;
        this.entries = entries;
    }

    static fromString(path: string, _content: string): Changelog {
        // Basic parsing - would need more sophisticated parsing in real implementation
        const entries: ChangelogEntry[] = [];
        // This is a simplified implementation
        // In a real implementation, you'd parse the markdown content
        return new Changelog(path, entries);
    }

    addEntry(entry: ChangelogEntry): Changelog {
        const newEntries = [entry, ...this.entries];
        return new Changelog(this.path, newEntries);
    }

    getLatestEntry(): ChangelogEntry | undefined {
        return this.entries[0];
    }

    getLatestEntryContent(): string {
        const latest = this.getLatestEntry();
        return latest?.content || "";
    }

    getEntryForVersion(version: Version): ChangelogEntry | undefined {
        return this.entries.find((entry) => entry.version.isEqualTo(version));
    }

    toString(): string {
        if (this.entries.length === 0) {
            return "# Changelog\n\nAll notable changes to this project will be documented in this file.\n";
        }

        const header =
            "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
        const entriesContent = this.entries
            .map((entry) => `## ${entry.title}\n\n${entry.content}\n`)
            .join("\n");

        return header + entriesContent;
    }

    toJSON(): object {
        return {
            path: this.path,
            entries: this.entries.map((entry) => ({
                version: entry.version.toString(),
                date: entry.date.toISOString(),
                title: entry.title,
                content: entry.content,
                commits: entry.commits,
            })),
        };
    }
}
