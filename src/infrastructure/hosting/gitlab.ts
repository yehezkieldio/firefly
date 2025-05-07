import { Gitlab } from "@gitbeaker/rest";
import { colors } from "consola/utils";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { removeHeaderFromChangelog } from "#/infrastructure/changelog/git-cliff";
import { resolveReleaseTitle, resolveTagName } from "#/infrastructure/config";
import { getRepositoryUrl, getToken, type Repository } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown, flattenMultilineText } from "#/infrastructure/utils";

interface ReleaseParams {
    name: string;
    tagName: string;
    description: string;
    ref: string;
}

function createReleaseParams(context: ArtemisContext, content: string): ReleaseParams {
    return {
        name: resolveReleaseTitle(context),
        tagName: resolveTagName(context),
        description: content,
        ref: resolveTagName(context)
    };
}

export function createGitLabRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createGitLab)
            .andThen((gitlab: InstanceType<typeof Gitlab>): ResultAsync<void, Error> => {
                const params = createReleaseParams(context, content);
                const logParams = { ...params };
                logParams.description = content.length > 100 ? content.slice(0, 100) + "..." : content;

                logger.verbose(
                    `Creating GitLab release with params: ${colors.dim(flattenMultilineText(JSON.stringify(logParams)))}`
                );

                if (context.options.dryRun) {
                    return okAsync(undefined);
                }

                const [owner, repo] = repository.split("/");
                if (!owner || !repo) {
                    return errAsync(new Error("Invalid repository format. Expected 'owner/repo'."));
                }

                const projectId = encodeURIComponent(`${owner}/${repo}`);

                return ResultAsync.fromPromise(
                    gitlab.ProjectReleases.create(projectId, {
                        name: params.name,
                        tag_name: params.tagName,
                        description: params.description,
                        ref: params.ref
                    }),
                    (error: unknown): Error => createErrorFromUnknown(error, "Failed to create GitLab release")
                ).map((): void => undefined);
            })
            .andTee((): void => {
                logger.info(`GitLab ${colors.dim("release")} created successfully${dryRunIndicator}`);
            });
    }

    return removeHeaderFromChangelog(context.changelogContent).andThen(
        (content: string): ResultAsync<ArtemisContext, Error> => {
            const repository = context.options.repository! as Repository;
            if (!repository) {
                throw new Error("Repository is not defined in the configuration.");
            }

            return publishRelease(repository, content).map((): ArtemisContext => context);
        }
    );
}

export function createGitLab(token: string): ResultAsync<InstanceType<typeof Gitlab>, Error> {
    try {
        const gitlab = new Gitlab({
            token,
            host: process.env.GITLAB_HOST || "https://gitlab.com"
        });

        return okAsync(gitlab);
    } catch (error) {
        return errAsync(createErrorFromUnknown(error, "Failed to create GitLab client"));
    }
}

export function executeGitLabCLI(args: string[]): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Response(
            Bun.spawn(["glab", ...args], {
                stdout: "pipe",
                stderr: "pipe"
            }).stdout
        ).text(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to execute GitLab CLI command")
    );
}

export function getGitLabCliToken(): ResultAsync<string, Error> {
    logger.verbose("Retrieving GitLab token from GitLab CLI");

    return executeGitLabCLI(["auth", "status"]).andThen((result: string): ResultAsync<string, Error> => {
        const hasApiScope: boolean =
            result.includes("api") || result.includes("read_api") || result.includes("write_api");
        if (!hasApiScope) logger.verbose("GitLab token does not have API scope");

        return executeGitLabCLI(["auth", "token"]).map((tokenResult: string) => {
            const token: string = tokenResult.trim();
            logger.verbose("Successfully retrieved GitLab token");
            return token;
        });
    });
}

export function isGitLabAuthenticated(): ResultAsync<boolean, Error> {
    logger.verbose("Checking GitLab CLI authentication status");

    return ResultAsync.fromPromise(
        executeGitLabCLI(["auth", "status"]),
        (error: unknown): Error => createErrorFromUnknown(error, "Failed to check GitLab authentication status")
    )
        .map((): boolean => true)
        .orElse((error: Error): Result<boolean, Error> => {
            if (error.message.includes("not logged in")) {
                return ok(false);
            }
            return err(error);
        });
}

export function getRepositoryUsingGitLabCLI(): ResultAsync<string, Error> {
    return executeGitLabCLI(["repo", "view", "--json", "webUrl"])
        .map((result: string): string => {
            const json: { webUrl: string } = JSON.parse(result);
            return json.webUrl;
        })
        .orElse((): ResultAsync<string, Error> => {
            logger.verbose("Failed to get repository using GitLab CLI, falling back to git");
            return getRepositoryUrl();
        });
}
