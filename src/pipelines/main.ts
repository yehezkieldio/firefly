import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { ResultAsync } from "neverthrow";
import { createContext } from "#/context";
import { enrichWithVersion } from "#/context-enrichment";
import { checkRepositoryConfiguration, getFileConfiguration } from "#/lib/config";
import { logger } from "#/lib/logger";
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

    return getFileConfiguration()
        .andThen(checkRepositoryConfiguration)
        .andThen((configuration: ArtemisConfiguration): ResultAsync<ArtemisContext, Error> => {
            return createContext(options, configuration);
        })
        .andThen(enrichWithVersion);
}
