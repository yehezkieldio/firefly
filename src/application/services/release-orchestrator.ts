import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { okAsync, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import {
    createRollbackStack,
    executeWithRollback,
    type RollbackOperation
} from "#/application/services/rollback-manager";
import { pipelineSteps } from "#/application/services/step-interfaces";
import { logger } from "#/infrastructure/logging";

export class ReleaseOrchestrator {
    run(initialContext: ArtemisContext): ResultAsync<void, Error> {
        if (initialContext.options.verbose) logger.level = LogLevels.verbose;

        const rollbackStack: RollbackOperation[] = createRollbackStack();
        let pipelineContext: ResultAsync<ArtemisContext, Error> = okAsync(initialContext);

        if (initialContext.options.dryRun) {
            logger.warn(colors.yellow("Running in dry run mode - no changes will be made"));
        }

        logger.info(colors.green("Starting pipeline..."));

        for (const step of pipelineSteps) {
            pipelineContext = pipelineContext.andThen((context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
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

        return pipelineContext
            .map((): void => undefined)
            .andTee((): void => logger.info(colors.green("Pipeline completed successfully")))
            .mapErr((error: Error): Promise<Error> => {
                logger.error(error.message);
                process.exit(1);
            });
    }
}
