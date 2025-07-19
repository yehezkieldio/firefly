interface CommitReference {
    readonly raw: string;
    readonly action: string | null;
    readonly owner: string | null;
    readonly repository: string | null;
    readonly issue: string;
    readonly prefix: string;
}

interface CommitNote {
    readonly title: string;
    readonly text: string;
}

interface CommitBase {
    readonly merge: string | null;
    readonly revert: Record<string, string | null> | null;
    readonly header: string | null;
    readonly body: string | null;
    readonly footer: string | null;
    readonly notes: CommitNote[];
    readonly mentions: string[];
    readonly references: CommitReference[];
}

export type Commit = CommitBase & Record<string, string | null>;
