import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { Task } from "#/application/task.interface";
import { FireflyError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class TaskExecutorService {
    async executeTask(task: Task): Promise<FireflyResult<void>> {
        logger.verbose(`TaskExecutorService: Executing task: ${task.getName() ?? "unknown"}`);
        const executeResult = await ResultAsync.fromPromise(task.execute(), (error) => this.normalizeError(error));

        if (executeResult.isErr()) {
            logger.verbose(
                `TaskExecutorService: Task failed: ${task.getName() ?? "unknown"} | Error: ${executeResult.error.message}`,
            );
            return errAsync(executeResult.error);
        }

        logger.verbose(`TaskExecutorService: Task succeeded: ${task.getName() ?? "unknown"}`);
        return okAsync();
    }

    async undoTask(task: Task): Promise<FireflyResult<void>> {
        logger.verbose(`TaskExecutorService: Undoing task: ${task.getName() ?? "unknown"}`);
        const undoResult = await ResultAsync.fromPromise(task.undo(), (error) => this.normalizeError(error));

        if (undoResult.isErr()) {
            logger.verbose(`Undo failed: ${task.getName() ?? "unknown"} | Error: ${undoResult.error.message}`);
            return errAsync(undoResult.error);
        }

        logger.verbose(`TaskExecutorService: Undo succeeded: ${task.getName() ?? "unknown"}`);
        return okAsync();
    }

    private normalizeError(error: unknown): FireflyError {
        if (error instanceof FireflyError) {
            return error;
        }

        return error as FireflyError;
    }
}
