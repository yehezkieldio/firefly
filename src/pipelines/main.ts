import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { ResultAsync } from "neverthrow";
import { createContext, enrichWithVersion } from "#/context";
import { checkNameAndScopeConfiguration, checkRepositoryConfiguration, getFileConfiguration } from "#/lib/config";
import { logger } from "#/lib/logger";
import { createRollbackStack, executeWithRollback, type RollbackOperation } from "#/lib/rollback";
import { bumpVersionPipeline, rollbackVersionPipeline } from "#/pipelines/bump-version";
import { createCommitPipeline, rollbackCommitPipeline } from "#/pipelines/create-commit";
import { createGitHubReleasePipeline, rollbackGitHubReleasePipeline } from "#/pipelines/create-github-release";
import { createVersionTagPipeline, rollbackVersionTagPipeline } from "#/pipelines/create-version-tag";
import { generateChangelogPipeline, rollbackChangelogPipeline } from "#/pipelines/generate-changelog";
import { preflightPipeline } from "#/pipelines/preflight";
import { promptVersionPipeline } from "#/pipelines/prompt-version";
import { pushChangesPipeline } from "#/pipelines/push-changes";
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
        rollback: rollbackVersionPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipBump
    },
    {
        name: "generateChangelog",
        description: "Generating the changelog",
        operation: generateChangelogPipeline,
        rollback: rollbackChangelogPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipChangelog
    },
    {
        name: "createCommit",
        description: "Creating the commit",
        operation: createCommitPipeline,
        rollback: rollbackCommitPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipCommit
    },
    {
        name: "createVersionTag",
        description: "Creating the version tag and the tag annotation",
        operation: createVersionTagPipeline,
        rollback: rollbackVersionTagPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipTag
    },
    {
        name: "pushChanges",
        description: "Pushing changes to the remote repository",
        operation: pushChangesPipeline,
        rollback: null,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipPush
    },
    {
        name: "createGitHubRelease",
        description: "Creating the GitHub release",
        operation: createGitHubReleasePipeline,
        rollback: rollbackGitHubReleasePipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipGitHubRelease
    }
];

export function createPipeline(options: ArtemisOptions): ResultAsync<void, Error> {
    preflightPipeline()
        .map((): void => logger.log(colors.green("Preflight checks completed successfully")))
        .mapErr((error: Error): Promise<Error> => {
            logger.error(error.message);
            process.exit(1);
        });
    const rollbackStack: RollbackOperation[] = createRollbackStack();
    let pipelineResult: ResultAsync<ArtemisContext, Error> = createContextFromOptions(options);

    if (options.dryRun) {
        logger.warn(colors.yellow("Running in dry run mode - no changes will be made"));
    }

    logger.log(colors.green("Starting pipeline..."));

    for (const step of pipelineSteps) {
        pipelineResult = pipelineResult.andThen((context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
            if (process.env.ARTEMIS_DEBUG) {
                logger.log(colors.dim("options"));
                logger.log(colors.dim(JSON.stringify(options, null, 2)));

                logger.log(colors.dim("configuration"));
                logger.log(colors.dim(JSON.stringify(context, null, 2)));
            }

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
        .andTee((): void => logger.log(colors.green("\nPipeline completed successfully")))
        .mapErr((error: Error): Promise<Error> => {
            logger.error(error.message);
            process.exit(1);
        });
}

function createContextFromOptions(options: ArtemisOptions): ResultAsync<ArtemisContext, Error> {
    if (options.verbose) logger.level = LogLevels.verbose;

    return getFileConfiguration()
        .andThen(checkRepositoryConfiguration)
        .andThen(checkNameAndScopeConfiguration)
        .andThen((configuration: ArtemisConfiguration): ResultAsync<ArtemisContext, Error> => {
            return createContext(options, configuration);
        })
        .andThen(enrichWithVersion);
}
