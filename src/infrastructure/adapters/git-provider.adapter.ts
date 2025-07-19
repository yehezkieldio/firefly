import { ResultAsync } from "neverthrow";
import type { GitProviderPort } from "#/core/ports/git-provider.port";
import { GitError } from "#/shared/error";

export class GitProviderAdapter implements GitProviderPort {
    exec(args: string[]) {
        const command = Bun.spawn(["git", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new GitError("Failed to execute git command", e as Error)
        );
    }
}
