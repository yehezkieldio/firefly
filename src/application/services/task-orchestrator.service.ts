import type { ApplicationContext } from "#/application/context";
import { TaskExecutorService } from "#/application/services/task-executor.service";
import { TaskRollbackManager } from "#/application/services/task-rollback-manager.service";
import type { Task } from "#/application/task.interface";
import { logger } from "#/shared/utils/logger.util";

export class TaskOrchestratorService {
    private readonly rollbackManager: TaskRollbackManager;
    private readonly taskExecutor: TaskExecutorService;

    constructor(
        _context: ApplicationContext,
        private readonly tasks: Task[]
    ) {
        this.rollbackManager = new TaskRollbackManager();
        this.taskExecutor = new TaskExecutorService();
    }

    async run(): Promise<void> {
        logger.verbose("TaskOrchestratorService: Starting task run sequence");
        for (const task of this.tasks) {
            logger.verbose(`TaskOrchestratorService: Preparing to run task: ${task.getName() ?? "unknown"}`);
            if (this.shouldRegisterForRollback(task)) {
                logger.verbose(
                    `TaskOrchestratorService: Registering task for rollback: ${task.getName() ?? "unknown"}`
                );
                this.rollbackManager.addTask(task);
            }

            // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is required for tasks
            const result = await this.taskExecutor.executeTask(task);

            if (result.isErr()) {
                logger.verbose(
                    `TaskOrchestratorService: Task failed, initiating failure handler for: ${task.getName() ?? "unknown"}`
                );
                await this.handleFailure(result.error);
                return;
            }
        }
        logger.verbose("TaskOrchestratorService: All tasks completed successfully");
    }

    private shouldRegisterForRollback(task: Task): boolean {
        return task.isUndoable?.() ?? true;
    }

    private async handleFailure(error: Error): Promise<void> {
        logger.error(error.message);
        logger.verbose("TaskOrchestratorService: Handling failure, checking for rollbacks");

        if (!this.rollbackManager.hasTasks()) {
            logger.verbose("TaskOrchestratorService: No rollback tasks to execute");
            return;
        }

        logger.verbose("TaskOrchestratorService: Executing rollback sequence");
        await this.rollbackManager.executeRollback(this.taskExecutor);
    }

    getRollbackManager(): TaskRollbackManager {
        return this.rollbackManager;
    }

    clearRollbacks(): void {
        this.rollbackManager.clear();
    }
}
