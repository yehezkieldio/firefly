import { LogLevels } from "consola";
import { type ResultAsync } from "neverthrow";
import { createContext } from "#/context";
import { getFileConfiguration } from "#/lib/config";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
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

    for (const step of pipelineSteps) {
        pipelineResult = pipelineResult.andThen((context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
            return executeWithRollback(step.operation, step.rollback, step.description, context, rollbackStack);
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
        .andThen((configuration: ArtemisConfiguration): ResultAsync<ArtemisContext, Error> => {
            return createContext(options, configuration);
        })
        .andThen(enrichWithVersion);
}
