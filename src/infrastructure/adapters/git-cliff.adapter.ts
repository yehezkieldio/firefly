import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { err, ok, ResultAsync } from "neverthrow";
import type { ChangelogHandlerOptions } from "#/application/services/changelog-handler.service";
import { TokenService } from "#/infrastructure/services/token.service";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export class GitCliffAdapter {
    private readonly tokenService: TokenService;

    constructor() {
        this.tokenService = new TokenService();
    }

    async generate(options: ChangelogHandlerOptions): Promise<FireflyResult<string>> {
        if (!options) {
            return err(new ConfigurationError("ChangelogHandlerOptions cannot be null or undefined"));
        }

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

    private createGitCliffOptions(options: ChangelogHandlerOptions): FireflyResult<GitCliffOptions> {
        if (!options.tagName?.trim()) {
            return err(new ConfigurationError("Tag name is required for GitCliff generation"));
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

    private async executeGitCliff(options: GitCliffOptions): Promise<AsyncFireflyResult<string>> {
        const optionsWithToken = await this.addGitHubToken(options);
        if (optionsWithToken.isErr()) {
            return err(optionsWithToken.error);
        }

        logger.verbose("GitCliffAdapter: GitHub token added to options.");
        return ResultAsync.fromPromise(
            runGitCliff(optionsWithToken.value, { stdio: "pipe" }),
            (error) => new ProcessExecutionError("GitCliff execution failed", error as Error)
        )
            .andTee((r) => {
                logger.verbose(`GitCliffAdapter: Executing ${this.redactTokenFromCommand(r.escapedCommand)}`);
            })
            .map((result) => result.stdout);
    }

    private async addGitHubToken(options: GitCliffOptions): Promise<FireflyResult<GitCliffOptions>> {
        const getTokenResult = await this.tokenService.getGithubToken();
        if (getTokenResult.isErr()) {
            return err(new ConfigurationError("Failed to get GitHub token", getTokenResult.error));
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
