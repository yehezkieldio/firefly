import { err, ok } from "neverthrow";
import type { GitHubCliProviderPort } from "#/core/ports/github-cli.port";
import type { CreateReleaseOptions, ReleaseProviderPort } from "#/core/ports/release-provider.port";
import { ProcessExecutionError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitHubCliReleaseAdapter implements ReleaseProviderPort {
    constructor(private readonly ghCliProvider: GitHubCliProviderPort) {}

    async createRelease(input: CreateReleaseOptions): Promise<FireflyResult<void>> {
        const args = [
            "release",
            "create",
            input.tag,
            "--title",
            input.title,
            "--notes",
            input.content,
            input.latest ? "--latest" : "",
            input.draft ? "--draft" : "",
            input.prerelease ? "--prerelease" : "",
        ].filter(Boolean);

        const result = await this.ghCliProvider.exec(args, input.dryRun);

        if (result.isErr()) {
            return err(new ProcessExecutionError("Failed to create GitHub release", result.error));
        }

        return ok(undefined);
    }
}
