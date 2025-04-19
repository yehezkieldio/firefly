import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { createDefaultConfiguration } from "#/context";
import { extractRepository, getRepository, type Repository } from "#/lib/git";
import { getRepositoryUsingGitHubCLI } from "#/lib/github";
import { logger } from "#/lib/logger";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisConfiguration } from "#/types";

export function getFileConfiguration(): ResultAsync<ArtemisConfiguration, Error> {
    return ResultAsync.fromPromise(
        loadConfig<ArtemisConfiguration>({
            name: "artemis",
            defaults: createDefaultConfiguration()
        }),
        (e: unknown): Error => createErrorFromUnknown(e, "Failed to load configuration")
    ).map((config: ResolvedConfig<ArtemisConfiguration, ConfigLayerMeta>): ArtemisConfiguration => config.config);
}

export function checkRepositoryConfiguration(
    configuration: ArtemisConfiguration
): ResultAsync<ArtemisConfiguration, Error> {
    const repoPattern = /^[^/]+\/[^/]+$/;

    function attemptAutoDetectRepository(): ResultAsync<ArtemisConfiguration, Error> {
        logger.verbose("Repository not configured, attempting to detect from git");
        return getRepository()
            .orElse(() => {
                logger.verbose("Failed to get repository from git, trying GitHub CLI");
                return getRepositoryUsingGitHubCLI().andThen((url: string): ResultAsync<Repository, Error> => {
                    const result = extractRepository(url);
                    if (result.isOk()) {
                        const ownerRepo = `${result.value.owner}/${result.value.repo}` as Repository;
                        return okAsync(ownerRepo);
                    }
                    return errAsync(result.error);
                });
            })
            .map(
                (repository: Repository): ArtemisConfiguration => ({
                    ...configuration,
                    repository
                })
            );
    }

    if (!configuration.repository || configuration.repository.trim() === "") {
        return attemptAutoDetectRepository();
    }

    if (!repoPattern.test(configuration.repository)) {
        return errAsync(new Error("Repository in configuration file must be in the format of <owner>/<repo>"));
    }

    return okAsync(configuration);
}
