import { okAsync, type ResultAsync } from "neverthrow";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export type RollbackOperation = {
    operation: (context: ArtemisContext) => ResultAsync<void, Error>;
    description: string;
};

export function createRollbackStack(): RollbackOperation[] {
    return [];
}

export function executeWithRollback<T>(
    operation: (context: T) => ResultAsync<T, Error>,
    rollbackOp: ((context: ArtemisContext) => ResultAsync<void, Error>) | null,
    description: string,
    context: T,
    rollbackStack: RollbackOperation[]
): ResultAsync<T, Error> {
    return operation(context).map((result: T): T => {
        if (rollbackOp) {
            addRollbackOperation(rollbackStack, rollbackOp, description);
        }
        return result;
    });
}

export function addRollbackOperation(
    stack: RollbackOperation[],
    operation: (context: ArtemisContext) => ResultAsync<void, Error>,
    description: string
): void {
    stack.push({ operation, description });
}

export function executeRollback(context: ArtemisContext, operations: RollbackOperation[]): ResultAsync<void, Error> {
    if (operations.length === 0) {
        return okAsync<void, Error>(undefined);
    }

    logger.warn("Initiating rollback of failed operations...");

    return operations
        .reverse()
        .reduce((promise: ResultAsync<void, Error>, { operation }: RollbackOperation): ResultAsync<void, Error> => {
            return promise.andThen((): ResultAsync<void, Error> => {
                return operation(context);
            });
        }, okAsync<void, Error>(undefined))
        .mapErr((error: Error): Error => {
            logger.error("Rollback failed:", error);
            return error;
        });
}
