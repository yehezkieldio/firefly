import type { AsyncFireflyResult } from "#/shared/utils/result.util";

export interface GitHubCliProviderPort {
    exec(args: string[], dryRun?: boolean): AsyncFireflyResult<string>;
}
