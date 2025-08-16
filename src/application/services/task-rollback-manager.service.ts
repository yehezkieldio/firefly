import type { TaskExecutorService } from "#/application/services/task-executor.service";
import type { Task } from "#/application/task.interface";
import { logger } from "#/shared/utils/logger.util";

export class TaskRollbackManager {
    private readonly tasks: Task[] = [];

    addTask(command: Task): void {
        if (!command) {
            logger.warn("Invalid task provided to rollback manager");
            return;
        }

        logger.verbose(`TaskRollbackManager: Adding task to rollback stack: ${command.getName() ?? "unknown"}`);
        this.tasks.push(command);
    }

    async executeRollback(taskExecutor: TaskExecutorService): Promise<boolean> {
        if (!this.hasTasks()) {
            logger.verbose("TaskRollbackManager: No rollback tasks to execute");
            return true;
        }

        logger.verbose("TaskRollbackManager: Starting rollback sequence");
        const reversedCommands = this.tasks.slice().reverse();

        for (const command of reversedCommands) {
            logger.verbose(`TaskRollbackManager: Rolling back task: ${command.getName() ?? "unknown"}`);
            const result = await taskExecutor.undoTask(command);

            if (result.isErr()) {
                logger.error(`Rollback failed for ${command.getName()}: ${result.error.message}`);
                logger.verbose(`TaskRollbackManager: Rollback failed for ${command.getName() ?? "unknown"}`);
                return false;
            }
            logger.verbose(`TaskRollbackManager: Rollback succeeded for ${command.getName() ?? "unknown"}`);
        }

        logger.verbose("TaskRollbackManager: Rollback sequence completed successfully");
        return true;
    }

    clear(): void {
        this.tasks.length = 0;
    }

    getTaskCount(): number {
        return this.tasks.length;
    }

    hasTasks(): boolean {
        return this.tasks.length > 0;
    }
}
