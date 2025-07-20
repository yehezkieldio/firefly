import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { errAsync, ResultAsync } from "neverthrow";
import type { ApplicationContext } from "#/application/context";
import type { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import type { ConfigResolverService } from "#/infrastructure/config/resolver.service";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class GitCliffAdapter {
    constructor(
        private readonly configResolver: ConfigResolverService,
        private readonly gitProvider: GitProviderAdapter
    ) {}

    generate(context: ApplicationContext): AsyncFireflyResult<string> {
        if (!context) {
            return errAsync(new ConfigurationError("ApplicationContext cannot be null or undefined"));
        }

        return this.createOptions(context)
            .andThen((options) => this.executeGitCliff(options))
            .mapErr((error) =>
                error instanceof ProcessExecutionError
                    ? error
                    : new ProcessExecutionError("GitCliff generation failed", error)
            );
    }

    private createOptions(context: ApplicationContext): AsyncFireflyResult<GitCliffOptions> {
        return ResultAsync.fromPromise(
            this.buildOptionsAsync(context),
            (error) => new ConfigurationError("Failed to create GitCliff options", error as Error)
        );
    }

    private executeGitCliff(options: GitCliffOptions): AsyncFireflyResult<string> {
        return ResultAsync.fromPromise(
            runGitCliff(options, { stdio: "pipe" }),
            (error) => new ProcessExecutionError("GitCliff execution failed", error as Error)
        ).map((result) => result.stdout);
    }

    private async buildOptionsAsync(context: ApplicationContext): Promise<GitCliffOptions> {
        const config = context.getConfig();
        const tagName = this.configResolver.resolveTagName(config.tagName, context);

        let options = this.createInitialOptions(tagName);

        options = this.addGitHubToken(options);
        options = await this.addRepositoryConfiguration(options, config);
        options = this.addDryRunConfiguration(options, config);
        options = this.addReleaseNotesConfiguration(options, config);

        return options;
    }

    private addGitHubToken(options: GitCliffOptions): GitCliffOptions {
        const token = this.configResolver.getTokenByEnvironmentVariable();
        return {
            ...options,
            githubToken: token,
        };
    }

    private async addRepositoryConfiguration(
        options: GitCliffOptions,
        config: ReturnType<ApplicationContext["getConfig"]>
    ): Promise<GitCliffOptions> {
        const rootDirection = await this.getRootDirectionSafely();
        const repository = await this.getRepositorySafely();

        if (rootDirection && rootDirection !== ".") {
            return {
                ...options,
                repository: rootDirection,
                includePath: `${config.base}/*`,
                githubRepo: `${repository.owner}/${repository.repository}`,
            };
        }

        return {
            ...options,
            githubRepo: `${repository.owner}/${repository.repository}`,
        };
    }

    private addDryRunConfiguration(
        options: GitCliffOptions,
        config: ReturnType<ApplicationContext["getConfig"]>
    ): GitCliffOptions {
        if (config.dryRun) {
            return options;
        }

        return {
            ...options,
            prepend: config.changelogPath,
        };
    }

    private addReleaseNotesConfiguration(
        options: GitCliffOptions,
        config: ReturnType<ApplicationContext["getConfig"]>
    ): GitCliffOptions {
        if (!config.releaseNotes?.trim()) {
            return options;
        }

        return {
            ...options,
            withTagMessage: config.releaseNotes.replace(/\\n/g, "\n"),
        };
    }

    private async getRootDirectionSafely(): Promise<string> {
        const result = await this.gitProvider.getRootDirection();

        if (result.isErr()) {
            throw new ConfigurationError("Failed to get root directory", result.error);
        }

        return result.value;
    }

    private async getRepositorySafely() {
        const result = await this.gitProvider.getRepository();

        if (result.isErr()) {
            throw new ConfigurationError("Failed to get repository information", result.error);
        }

        return result.value;
    }

    private createInitialOptions(tagName: string): GitCliffOptions {
        if (!tagName?.trim()) {
            throw new ConfigurationError("Tag name cannot be empty");
        }

        return {
            tag: tagName,
            unreleased: true,
            config: "./cliff.toml",
            output: "-",
        };
    }
}
