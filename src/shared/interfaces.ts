import type { FireflyAsyncResult } from "#/utils/result";

export interface GitStatus {
    readonly hasStaged: boolean;
    readonly hasUnstaged: boolean;
    readonly hasUntracked: boolean;
    readonly isClean: boolean;
}

export interface UnpushedCommitsResult {
    readonly hasUnpushed: boolean;
    readonly count: number;
}

export interface IFileSystemService {
    exists(path: string): FireflyAsyncResult<boolean>;
    read(path: string): FireflyAsyncResult<string>;
    readJson<T>(path: string): FireflyAsyncResult<T>;
    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void>;
    writeJson<T>(path: string, data: T, options?: WriteJsonOptions): FireflyAsyncResult<void>;
}

export interface WriteOptions {
    readonly dryRun?: boolean;
}

export interface WriteJsonOptions extends WriteOptions {
    readonly indent?: number;
}

export interface IGitService {
    isRepository(): FireflyAsyncResult<boolean>;
    currentBranch(): FireflyAsyncResult<string>;
    status(): FireflyAsyncResult<GitStatus>;
    isClean(): FireflyAsyncResult<boolean>;
    unpushedCommits(): FireflyAsyncResult<UnpushedCommitsResult>;
    repositoryRoot(): FireflyAsyncResult<string>;
    listTags(): FireflyAsyncResult<string[]>;
    commit(message: string, options?: CommitOptions): FireflyAsyncResult<CommitResult>;
    tag(name: string, options?: TagOptions): FireflyAsyncResult<void>;
    push(options?: PushOptions): FireflyAsyncResult<void>;
    add(paths: string | string[]): FireflyAsyncResult<void>;
}

export interface CommitOptions {
    readonly sign?: boolean;
    readonly allowEmpty?: boolean;
    readonly paths?: string[];
    readonly noVerify?: boolean;
    readonly dryRun?: boolean;
}

export interface CommitResult {
    readonly sha: string;
}

export interface TagOptions {
    readonly message?: string;
    readonly sign?: boolean;
    readonly dryRun?: boolean;
}

export interface PushOptions {
    readonly remote?: string;
    readonly branch?: string;
    readonly tags?: boolean;
    readonly followTags?: boolean;
    readonly dryRun?: boolean;
}

export interface WorkflowServices {
    readonly fs: IFileSystemService;
    readonly git: IGitService;
}
