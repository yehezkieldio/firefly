import { colors } from "consola/utils";
import { okAsync, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import type { RollbackOperation } from "#/application/services/rollback-manager";
import { logger } from "#/infrastructure/logging";

export class ReleaseOrchestrator {
    run(initialContext: ArtemisContext): ResultAsync<void, Error> {
        const rollbackStack: RollbackOperation[] = [];
        let currentContext = initialContext;

        if (currentContext.options.dryRun) {
            logger.warn(colors.yellow("Running in dry run mode - no changes will be made"));
        }

        return okAsync(undefined);
    }
}
