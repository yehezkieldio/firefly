export interface CommitReference {
    readonly raw: string;
    readonly action: string | null;
    readonly owner: string | null;
    readonly repository: string | null;
    readonly issue: string;
    readonly prefix: string;
}

export interface CommitNote {
    readonly title: string;
    readonly text: string;
}

export interface CommitBase {
    readonly merge: string | null;
    readonly revert: Readonly<Record<string, string | null>> | null;

    readonly header: string | null;
    readonly body: string | null;
    readonly footer: string | null;

    readonly notes: readonly CommitNote[];
    readonly mentions: readonly string[];
    readonly references: readonly CommitReference[];
}

export interface Commit extends CommitBase {
    readonly hash?: string | null;
    readonly date?: string | null;
    readonly author?: string | null;
    readonly type?: string | null;
    readonly scope?: string | null;
    readonly subject?: string | null;

    readonly [key: string]:
        | string
        | readonly string[]
        | null
        | readonly CommitNote[]
        | readonly CommitReference[]
        | Readonly<Record<string, string | null>>
        | undefined;
}
