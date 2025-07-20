import z from "zod";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export const RepositorySchema = z.object({
    owner: z.string(),
    repository: z.string(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export interface GitProviderPort {
    stageChanges(): Promise<AsyncFireflyResult<void>>;
    createCommit(message: string): Promise<AsyncFireflyResult<void>>;
    resetLastCommit(): Promise<AsyncFireflyResult<void>>;
    createTag(tag: string, message?: string): Promise<AsyncFireflyResult<void>>;
    isInsideGitRepository(): Promise<AsyncFireflyResult<boolean>>;
    getRootDirection(): Promise<AsyncFireflyResult<string>>;
    getRepositoryUrl(): Promise<AsyncFireflyResult<string>>;
    getRepository(): Promise<AsyncFireflyResult<Repository>>;
    extractRepository(url: string): Repository | null;
    exec(args: string[]): AsyncFireflyResult<string>;
}
