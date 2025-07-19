import type { ResultAsync } from "neverthrow";
import type { GitError } from "#/shared/error";

export interface GitProviderPort {
    exec(args: string[]): ResultAsync<string, GitError>;
}
