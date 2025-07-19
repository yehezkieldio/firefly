import { err, ok, okAsync, type ResultAsync } from "neverthrow";
import type { ApplicationContext } from "#/application/context";
import { RollbackError } from "#/shared/error";
import { logger } from "#/shared/logger";
import type { FireflyResult } from "#/shared/result";

export type RollbackOperation = {
    operation: (context: ApplicationContext) => Promise<FireflyResult<void>>;
    description: string;
};

export class RollbackManager {
    private readonly operations: RollbackOperation[] = [];
    private readonly context: ApplicationContext;

    constructor(context: ApplicationContext) {
        this.context = context;
    }

    addOperation(
        operation: (context: ApplicationContext) => Promise<FireflyResult<void>>,
        description: string
    ): void {
        this.operations.push({ operation, description });
    }

    executeWithRollback<T>(
        operation: (context: T) => ResultAsync<T, Error>,
        rollbackOp: ((context: ApplicationContext) => Promise<FireflyResult<void>>) | null,
        description: string,
        context: T,
        shouldSkip?: (context: T) => boolean
    ): ResultAsync<T, Error> {
        if (shouldSkip?.(context)) {
            logger.verbose(`Skipping step: ${description}`);
            return okAsync(context);
        }

        logger.verbose(`${description}...`);
        return operation(context).map((result: T): T => {
            if (rollbackOp) {
                this.addOperation(rollbackOp, description);
            }
            return result;
        });
    }

    async executeRollback(): Promise<FireflyResult<void>> {
        if (this.operations.length === 0) {
            return ok(undefined);
        }

        logger.warn("Initiating rollback of failed operations...");

        for (const { operation, description } of this.operations.slice().reverse()) {
            logger.verbose(`Rolling back: ${description}`);

            try {
                // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required
                const result = await operation(this.context);
                if (result.isErr()) {
                    const errorMsg = `Rollback failed for operation: ${description}`;
                    logger.error(errorMsg, result.error);

                    return err(
                        new RollbackError(
                            errorMsg,
                            result.error instanceof Error ? result.error : new Error(String(result.error))
                        )
                    );
                }
            } catch (error) {
                const errorMsg = `Rollback threw error for operation: ${description}`;
                logger.error(errorMsg, error);

                return err(
                    new RollbackError(errorMsg, error instanceof Error ? error : new Error(String(error)))
                );
            }
        }

        return ok(undefined);
    }

    clear(): void {
        this.operations.splice(0, this.operations.length);
    }

    getOperationCount(): number {
        return this.operations.length;
    }

    hasOperations(): boolean {
        return this.operations.length > 0;
    }
}
