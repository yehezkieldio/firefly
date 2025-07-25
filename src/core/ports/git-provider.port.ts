import z from "zod";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export const RepositorySchema = z.object({
    owner: z.string(),
    repository: z.string(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export interface GitProviderPort {
    stageChanges(): Promise<FireflyResult<void>>;
    createCommit(message: string): Promise<FireflyResult<void>>;
    resetLastCommit(): Promise<FireflyResult<void>>;
    restoreFileToHead(pathToFile: string): Promise<FireflyResult<void>>;
    createTag(tag: string, message?: string): Promise<FireflyResult<void>>;
    deleteLocalTag(tag: string): Promise<FireflyResult<void>>;
    isInsideGitRepository(): Promise<FireflyResult<boolean>>;
    getRootDirection(): Promise<FireflyResult<string>>;
    getRepositoryUrl(): Promise<FireflyResult<string>>;
    extractRepository(url: string): FireflyResult<Repository>;
    getCurrentBranch(): Promise<FireflyResult<string>>;
    getAvailableBranches(): Promise<FireflyResult<string[]>>;
    isProvidedBranchValid(branch: string): Promise<FireflyResult<boolean>>;
    isCurrentBranch(branch: string): Promise<FireflyResult<boolean>>;
    exec(args: string[]): AsyncFireflyResult<string>;
}
