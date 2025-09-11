import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { ResultAsync, err, ok } from "neverthrow";
import type { ChangelogGeneratorOptions } from "#/modules/changelog/services/changelog-generator.service";
import { GitHubProvider } from "#/modules/github/github.provider";
import { logger } from "#/shared/logger";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class GitCliffAdapter {
    async generate(options: ChangelogGeneratorOptions): Promise<FireflyResult<string>> {
        const gitCliffOptionsResult = this.createGitCliffOptions(options);
        if (gitCliffOptionsResult.isErr()) {
            return err(gitCliffOptionsResult.error);
        }

        logger.verbose("GitCliffAdapter: GitCliff options created successfully.");
        const gitCliffOptions = gitCliffOptionsResult.value;

        const executeResult = await this.executeGitCliff(gitCliffOptions);
        if (executeResult.isErr()) {
            return err(executeResult.error);
        }

        logger.verbose("GitCliffAdapter: GitCliff executed successfully.");
        return ok(executeResult.value);
    }

    private createGitCliffOptions(options: ChangelogGeneratorOptions): FireflyResult<GitCliffOptions> {
        if (options.tagName?.trim()) {
            return err(
                createFireflyError({
                    message: "GitCliffAdapter: Tag name is required but was provided in options.",
                    code: "INVALID",
                }),
            );
        }

        const gitCliffOptions: GitCliffOptions = {
            tag: options.tagName,
            unreleased: true,
            config: "./cliff.toml",
            output: "-",
        };

        if (options.releaseNotes) {
            gitCliffOptions.withTagMessage = options.releaseNotes.replace(/\\n/g, "\n");
            logger.verbose("GitCliffAdapter: Release notes set.");
        }

        if (options.dryRun) {
            logger.verbose("GitCliffAdapter: Prepend option will not be set for dry run.");
        } else {
            gitCliffOptions.prepend = options.changelogPath;
            logger.verbose("GitCliffAdapter: Prepend option set for changelog path.");
        }

        if (options.hasRootDirection) {
            gitCliffOptions.repository = options.rootDirection;
            gitCliffOptions.includePath = options.includePath;
            logger.verbose(`GitCliffAdapter: Include path set to ${options.includePath}`);
        }

        if (options.repository) {
            gitCliffOptions.githubRepo = options.repository;
            logger.verbose(`GitCliffAdapter: Repository set to ${options.repository}`);
        }

        logger.verbose("GitCliffAdapter: GitCliffOptions constructed.");
        return ok(gitCliffOptions);
    }

    private executeGitCliff(options: GitCliffOptions): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(this.addGitHubToken(options), toFireflyError).andThen((opts) => {
            if (opts.isErr()) {
                return err(opts.error);
            }

            const safeOpts = { ...opts.value };
            const tokenRef = safeOpts.githubToken;

            return ResultAsync.fromPromise(runGitCliff(safeOpts, { stdio: "pipe" }), toFireflyError)
                .andTee((r) =>
                    logger.verbose(`GitCliffAdapter: Executing ${this.redactTokenFromCommand(r.escapedCommand)}`),
                )
                .map((result) => {
                    if (tokenRef) {
                        safeOpts.githubToken = "";
                    }

                    return result.stdout;
                });
        });
    }

    private async addGitHubToken(options: GitCliffOptions): Promise<FireflyResult<GitCliffOptions>> {
        const getTokenResult = await GitHubProvider.getInstance().token.getToken();
        if (getTokenResult.isErr()) {
            return err(getTokenResult.error);
        }

        logger.verbose("GitCliffAdapter: GitHub token retrieved successfully.");
        return ok({
            ...options,
            githubToken: getTokenResult.value,
        });
    }

    private redactTokenFromCommand(command: string): string {
        const tokenPattern = /--github-token\s+([^\s]+)/g;
        return command.replace(tokenPattern, "--github-token REDACTED_FOR_SECURITY");
    }
}
