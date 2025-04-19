import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { createContext } from "#/context";
import { getFileConfiguration } from "#/lib/config";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { extractRepository, getRepository, getRepositoryUsingGitHubCLI, type Repository } from "#/lib/git";
import { logger } from "#/lib/logger";
import { type PackageJson, pkgJson } from "#/lib/package-json";
import { createRollbackStack, executeWithRollback, type RollbackOperation } from "#/lib/rollback";
import { bumpVersionPipeline } from "#/pipelines/bump-version";
import { promptVersionPipeline } from "#/pipelines/prompt-version";
import type { ArtemisConfiguration, ArtemisContext, ArtemisOptions } from "#/types";

interface PipelineStep {
    name: string;
    description: string;
    operation: (context: ArtemisContext) => ResultAsync<ArtemisContext, Error>;
    rollback: ((context: ArtemisContext) => ResultAsync<void, Error>) | null;
    shouldSkip?: (context: ArtemisContext) => boolean;
}

const pipelineSteps: PipelineStep[] = [
    {
        name: "promptVersion",
        description: "Prompting for the new version",
        operation: promptVersionPipeline,
        rollback: null,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipBump
    },
    {
        name: "bumpVersion",
        description: "Bumping the version",
        operation: bumpVersionPipeline,
        rollback: null,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipBump
    }
];

export function createPipeline(options: ArtemisOptions): ResultAsync<void, Error> {
    const rollbackStack: RollbackOperation[] = createRollbackStack();
    let pipelineResult: ResultAsync<ArtemisContext, Error> = createContextFromOptions(options);

    if (options.dryRun) {
        logger.warn(colors.yellow("Running in dry run mode - no changes will be made"));
    }

    for (const step of pipelineSteps) {
        pipelineResult = pipelineResult.andThen((context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
            return executeWithRollback(
                step.operation,
                step.rollback,
                step.description,
                context,
                rollbackStack,
                step.shouldSkip
            );
        });
    }

    return pipelineResult
        .map((): void => undefined)
        .mapErr((error: Error): Promise<Error> => {
            logger.error(error.message);
            process.exit(1);
        });
}

function createContextFromOptions(options: ArtemisOptions): ResultAsync<ArtemisContext, Error> {
    if (options.verbose) logger.level = LogLevels.verbose;

    function checkRepositoryConfiguration(
        configuration: ArtemisConfiguration
    ): ResultAsync<ArtemisConfiguration, Error> {
        const repoPattern = /^[^/]+\/[^/]+$/;

        if (!configuration.repository || configuration.repository.trim() === "") {
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

        if (!repoPattern.test(configuration.repository)) {
            return errAsync(new Error("Repository in configuration file must be in the format of <owner>/<repo>"));
        }

        return okAsync(configuration);
    }

    function enrichWithVersion(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
        function getVersion(): ResultAsync<string, Error> {
            return fs.getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(pkgJson.getPackageVersion);
        }

        return getVersion().map(
            (version: string): ArtemisContext => ({
                ...context,
                currentVersion: version
            })
        );
    }

    return getFileConfiguration()
        .andThen(checkRepositoryConfiguration)
        .andThen((configuration: ArtemisConfiguration): ResultAsync<ArtemisContext, Error> => {
            return createContext(options, configuration);
        })
        .andThen(enrichWithVersion);
}
