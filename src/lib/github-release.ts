import type { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/core/types";
import { colors } from "consola/utils";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { resolveReleaseTitle, resolveTagName } from "#/lib/config";
import { getToken, type Repository } from "#/lib/git";
import { removeHeaderFromChangelog } from "#/lib/git-cliff/parse-cliff-toml";
import { createOctokit, OctokitRequestHeaders } from "#/lib/github";
import { logger } from "#/lib/logger";
import { createErrorFromUnknown, flattenMultilineText } from "#/lib/utils";
import type { ArtemisContext } from "#/types";

interface ReleaseParams extends RequestParameters {
    owner: string;
    repo: string;
    tag_name: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    generate_release_notes: boolean;
    make_latest: "true" | "false";
    headers: typeof OctokitRequestHeaders;
}

function createReleaseParams(context: ArtemisContext, repository: Repository, content: string): ReleaseParams {
    const { githubReleaseDraft, githubReleasePrerelease, githubReleaseLatest } = context.options;

    const [owner, repo]: string[] = repository.split("/");
    if (!owner || !repo) {
        throw new Error("Invalid repository format. Expected 'owner/repo'.");
    }

    return {
        owner: owner,
        repo: repo,
        tag_name: resolveTagName(context),
        name: resolveReleaseTitle(context),
        body: content,
        draft: githubReleaseDraft,
        prerelease: githubReleasePrerelease,
        generate_release_notes: content === "",
        make_latest: String(githubReleaseLatest) as "true" | "false",
        headers: OctokitRequestHeaders
    };
}

export function createOctoKitGitHubRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createOctokit)
            .andThen((octokit: Octokit): ResultAsync<void, Error> => {
                const params: ReleaseParams = createReleaseParams(context, repository, content);
                logger.verbose(`Creating GitHub release with params: ${flattenMultilineText(JSON.stringify(params))}`);

                if (context.options.dryRun) {
                    return okAsync(undefined);
                }

                return ResultAsync.fromPromise(
                    octokit.request("POST /repos/{owner}/{repo}/releases", params),
                    (error: unknown): Error => createErrorFromUnknown(error, "Failed to create GitHub release")
                ).map((): void => undefined);
            })
            .andTee((): void => {
                logger.info(`${colors.dim("GitHub")} release created successfully${dryRunIndicator}`);
            });
    }

    return removeHeaderFromChangelog(context.changelogContent).andThen(
        (content: string): ResultAsync<ArtemisContext, Error> => {
            const repository = context.config.repository! as Repository;
            if (!repository) {
                throw new Error("Repository is not defined in the configuration.");
            }

            return publishRelease(repository, content).map((): ArtemisContext => context);
        }
    );
}

export function createCliGitHubRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        const { githubReleaseDraft, githubReleasePrerelease, githubReleaseLatest } = context.options;
        const tagName = resolveTagName(context);
        const title = resolveReleaseTitle(context);

        const cliArgs = ["release", "create", tagName, "--title", title, "--notes", content || ""];

        if (githubReleaseDraft) cliArgs.push("--draft");
        if (githubReleasePrerelease) cliArgs.push("--prerelease");
        if (githubReleaseLatest === false) cliArgs.push("--latest=false");
        if (content === "") cliArgs.push("--generate-notes");
        if (repository) cliArgs.push("--repo", repository);

        logger.verbose(
            `Creating ${colors.dim("GitHub")} release using CLI with args: ${flattenMultilineText(JSON.stringify(cliArgs))}`
        );

        if (context.options.dryRun) {
            return okAsync(undefined);
        }

        return ResultAsync.fromPromise(
            new Response(
                Bun.spawn(["gh", ...cliArgs], {
                    stdout: "pipe",
                    stderr: "pipe"
                }).stdout
            ).text(),
            (error: unknown): Error => createErrorFromUnknown(error, "Failed to create GitHub release using CLI")
        )
            .map((): void => undefined)
            .andTee((): void => {
                logger.info(`${colors.dim("GitHub")} release created successfully using CLI!${dryRunIndicator}`);
            });
    }

    return removeHeaderFromChangelog(context.changelogContent).andThen(
        (content: string): ResultAsync<ArtemisContext, Error> => {
            const repository = context.config.repository! as Repository;
            if (!repository) {
                throw new Error("Repository is not defined in the configuration.");
            }

            return publishRelease(repository, content).map((): ArtemisContext => context);
        }
    );
}

export function createFetchGitHubRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const dryRunIndicator = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        return getToken(context).andThen((token: string): ResultAsync<void, Error> => {
            const params = createReleaseParams(context, repository, content);
            const [owner, repo] = repository.split("/");

            logger.verbose(
                `Creating ${colors.dim("GitHub")} release using fetch with params: ${flattenMultilineText(JSON.stringify(params))}`
            );

            if (context.options.dryRun) {
                return okAsync(undefined);
            }

            return ResultAsync.fromPromise(
                fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        ...OctokitRequestHeaders
                    },
                    body: JSON.stringify({
                        tag_name: params.tag_name,
                        name: params.name,
                        body: params.body,
                        draft: params.draft,
                        prerelease: params.prerelease,
                        generate_release_notes: params.generate_release_notes,
                        make_latest: params.make_latest
                    })
                }),
                (error: unknown): Error => createErrorFromUnknown(error, "Failed to create GitHub release using fetch")
            )
                .andThen((response: Response): ResultAsync<void, Error> => {
                    if (!response.ok) {
                        return ResultAsync.fromPromise(
                            response.text(),
                            () => new Error("Failed to read error response")
                        ).andThen((text: string): ResultAsync<void, Error> => {
                            return errAsync(new Error(`GitHub API error: ${text}`));
                        });
                    }
                    return okAsync(undefined);
                })
                .andTee((): void => {
                    logger.info(`${colors.dim("GitHub")} release created successfully using fetch${dryRunIndicator}`);
                });
        });
    }

    return removeHeaderFromChangelog(context.changelogContent).andThen(
        (content: string): ResultAsync<ArtemisContext, Error> => {
            const repository = context.config.repository! as Repository;
            if (!repository) {
                throw new Error("Repository is not defined in the configuration.");
            }

            return publishRelease(repository, content).map((): ArtemisContext => context);
        }
    );
}

export function createGitHubRelease(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return createOctoKitGitHubRelease(context).orElse((error: Error): ResultAsync<ArtemisContext, Error> => {
        logger.warn(`Failed to create GitHub release using Octokit: ${error.message}`);
        logger.info("Falling back to CLI or fetch method...");

        return createCliGitHubRelease(context).orElse((error: Error): ResultAsync<ArtemisContext, Error> => {
            logger.warn(`Failed to create GitHub release using CLI: ${error.message}`);
            logger.info("Falling back to fetch method...");

            return createFetchGitHubRelease(context);
        });
    });
}
