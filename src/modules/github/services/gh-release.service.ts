import { err, ok } from "neverthrow";
import { executeGhCommand } from "#/modules/github/utils/gh-command-executor.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface CreateReleaseOptions {
    title: string;
    content: string;
    tag: string;
    latest: boolean;
    draft: boolean;
    prerelease: boolean;
    dryRun?: boolean;
}

export class GitHubReleaseService {
    async createRelease(input: CreateReleaseOptions): Promise<FireflyResult<void>> {
        const args = [
            "release",
            "create",
            input.tag,
            "--title",
            input.title,
            input.latest ? "--latest" : "",
            input.draft ? "--draft" : "",
            input.prerelease ? "--prerelease" : "",
        ];

        if (input.content.trim()) {
            args.push("--notes", input.content);
        }

        const result = await executeGhCommand(args.filter(Boolean), { dryRun: input.dryRun });
        if (result.isErr()) {
            return err(result.error);
        }

        return ok();
    }
}
