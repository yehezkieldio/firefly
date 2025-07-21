interface ChangelogConfig {
    header: string;
    body: string;
    trim: boolean;
    footer: string;
}

interface CommitParser {
    message: string;
    body: string;
    group: string;
    skip: boolean;
}

interface CommitPreprocessor {
    pattern: string;
    replace: string;
}

interface GitConfig {
    conventionalCommits: boolean;
    filterUnconventional: boolean;
    commitParsers: CommitParser[];
    commitPreprocessors: CommitPreprocessor[];
    filterCommits: boolean;
    tagPattern: string;
    ignoreTags: string;
    topoOrder: boolean;
    sortCommits: string;
}

export interface CliffToml {
    changelog: Partial<ChangelogConfig>;
    git: Partial<GitConfig>;
}
