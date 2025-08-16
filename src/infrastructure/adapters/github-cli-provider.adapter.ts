import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { type Repository, RepositorySchema } from "#/core/ports/git-provider.port";
import type { GitHubCliProviderPort } from "#/core/ports/github-cli.port";
import { REPOSITORY_PATTERNS } from "#/shared/utils/constants";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";
import { safeJsonParse } from "#/shared/utils/safe-json-parse.util";

export class GithubCliProviderAdapter implements GitHubCliProviderPort {
    private static instance: GithubCliProviderAdapter | null = null;

    private constructor() {}

    static create(): FireflyResult<GithubCliProviderAdapter> {
        const availabilityResult = GithubCliProviderAdapter.validateAvailability();
        if (availabilityResult.isErr()) {
            return err(availabilityResult.error);
        }

        if (!GithubCliProviderAdapter.instance) {
            GithubCliProviderAdapter.instance = new GithubCliProviderAdapter();
        }

        return ok(GithubCliProviderAdapter.instance);
    }

    async getToken(): Promise<AsyncFireflyResult<string>> {
        const result = await this.exec(["auth", "token"]);
        if (result.isErr()) {
            return err(result.error);
        }

        const token = result.value.trim();
        if (!token) {
            return err(new ConfigurationError("GitHub CLI token is empty. Please authenticate using 'gh auth login'."));
        }

        return ok(token);
    }

    async getRepositoryUrl(): Promise<FireflyResult<string>> {
        const result = await this.exec(["repo", "view", "--json", "url"]);
        if (result.isErr()) {
            return err(result.error);
        }

        const parseResult = safeJsonParse(result.value);
        if (parseResult.isErr()) {
            return err(new ConfigurationError("Failed to parse repository URL", parseResult.error));
        }

        const url = parseResult.value.url;
        if (!url) {
            return err(new ConfigurationError("Repository URL is empty"));
        }

        return ok(url);
    }

    extractRepository(url: string): FireflyResult<Repository> {
        if (!url?.trim()) {
            return err(new ConfigurationError("Repository URL is empty"));
        }

        for (const pattern of REPOSITORY_PATTERNS) {
            const match = url.match(pattern);
            if (match?.[1] && match?.[2]) {
                const parseResult = RepositorySchema.safeParse({
                    owner: match[1],
                    repository: match[2],
                });
                if (parseResult.success) {
                    return ok(parseResult.data);
                }
            }
        }

        return err(new ConfigurationError("Failed to extract repository from URL"));
    }

    private static validateAvailability(): FireflyResult<boolean> {
        const isAvailable: string | null = Bun.which("gh");
        if (!isAvailable) {
            return err(
                new ConfigurationError(
                    "GitHub CLI (gh) is not installed or not available in PATH. (See: https://cli.github.com)",
                ),
            );
        }

        return ok(true);
    }

    exec(args: string[], dryRun?: boolean): AsyncFireflyResult<string> {
        let logArgs: string;
        const dontTruncateNotes = !!process.env.FIREFLY_DEBUG_DONT_TRUNCATE_RELEASE_NOTES;
        if (args[0] === "release" && args[1] === "create" && !dontTruncateNotes) {
            const notesIdx = args.indexOf("--notes");
            if (notesIdx !== -1) {
                const trailingFlags = args.slice(notesIdx + 2).filter((a) => a.startsWith("--"));
                logArgs = [...args.slice(0, notesIdx + 1), "NOTES_TRUNCATED", ...trailingFlags].join(" ");
            } else {
                logArgs = args.join(" ");
            }
        } else {
            logArgs = args.join(" ");
        }

        if (dryRun && args[0] === "release" && args[1] === "create") {
            logger.verbose(`GitHubCliProviderAdapter: Dry run enabled, skipping command execution: gh ${logArgs}`);
            return okAsync("");
        }

        const command = Bun.spawn(["gh", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new ProcessExecutionError("Failed to execute gh command", e as Error),
        ).andTee(() => logger.verbose("GitHubCliProviderAdapter: Executed command:", `gh ${logArgs}`));
    }
}
