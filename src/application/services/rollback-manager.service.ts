import { err, ok, okAsync, type ResultAsync } from "neverthrow";
import type { ApplicationContext } from "#/application/context";
import { type FireflyError, RollbackError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";
import type { AsyncFireflyResult } from "#/shared/utils/result";

type Operation = (context: ApplicationContext) => AsyncFireflyResult<void>;
type OperationRollBack = ((context: ApplicationContext) => AsyncFireflyResult<void>) | null;
type OperationWithContext<T> = (context: T) => ResultAsync<T, Error>;

export interface RollbackOperation {
    readonly operation: Operation;
    readonly name: string;
    readonly description: string;
}

export interface ExecuteWithRollbackParams<T> {
    readonly operation: OperationWithContext<T>;
    readonly rollbackOp: OperationRollBack;
    readonly name: string;
    readonly description: string;
    readonly context: T;
    readonly shouldSkip?: (context: T) => boolean;
}

export class RollbackManager {
    private readonly operations: RollbackOperation[] = [];
    private readonly context: ApplicationContext;

    constructor(context: ApplicationContext) {
        this.context = context;
    }

    addOperation(operation: Operation, name: string, description: string): void {
        if (!operation) {
            logger.warn("Invalid operation provided to rollback manager");
            return;
        }

        if (!name?.trim()) {
            logger.warn("Invalid name provided to rollback manager");
            return;
        }

        this.operations.push({ operation, name, description });
    }

    executeWithRollback<T>(params: ExecuteWithRollbackParams<T>): ResultAsync<T, Error> {
        const { operation, rollbackOp, name, description, context, shouldSkip } = params;

        if (shouldSkip?.(context)) {
            logger.verbose(`Skipping command: ${name}`);
            return okAsync(context);
        }

        return operation(context).map((result: T): T => {
            if (rollbackOp) {
                this.addOperation(rollbackOp, name, description);
            }
            return result;
        });
    }

    async executeRollback(): Promise<AsyncFireflyResult<void>> {
        if (!this.hasOperations()) {
            return ok(undefined);
        }

        logger.warn("Initiating rollback of failed operations...");

        const reversedOperations = this.operations.slice().reverse();

        for (const { operation, name } of reversedOperations) {
            logger.verbose(`Rolling back: ${name}`);

            try {
                // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required for rollbacks
                const result = await operation(this.context);
                if (result.isErr()) {
                    return err(new RollbackError(`Rollback failed for operation: ${name}`, result.error));
                }
            } catch (error) {
                return err(new RollbackError(`Rollback threw error for operation: ${name}`, error as FireflyError));
            }
        }

        return ok(undefined);
    }

    clear(): void {
        this.operations.length = 0;
    }

    getOperationCount(): number {
        return this.operations.length;
    }

    hasOperations(): boolean {
        return this.operations.length > 0;
    }
}
