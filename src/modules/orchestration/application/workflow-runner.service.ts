import { LogLevels } from "consola";
import { ApplicationContext } from "#/application/context";
import type {
    OrchestrationContext,
    OrchestratorOptions,
} from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Workflow, WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import { TaskOrchestratorService } from "#/modules/orchestration/core/services/task-orchestrator.service";
import { logger } from "#/shared/logger";
import type { FireflyError } from "#/shared/utils/error.util";

/**
 * Options provided from the command-line interface or another entry point.
 */
export interface WorkflowRunnerOptions {
    dryRun?: boolean;
    verbose?: boolean;
    [key: string]: unknown;
}

/**
 * A service responsible for initializing and running a workflow.
 * It acts as a bridge between the CLI and the task orchestration engine.
 */
export class WorkflowRunnerService {
    async run(
        options: WorkflowRunnerOptions,
        workflowFactory: (context: ApplicationContext) => Workflow,
    ): Promise<void> {
        const contextResult = ApplicationContext.create({ ...options });
        if (contextResult.isErr()) {
            logger.error("Failed to create application context", contextResult.error);
            return;
        }

        const context = contextResult.value;
        logger.info(`Workflow runner started with execution ID: ${context.executionId}`);
        if (options.verbose) {
            logger.level = LogLevels.verbose;
        }

        const workflow = workflowFactory(context);
        if (options.dryRun) {
            logger.warn("Running in dry-run mode. No actual changes will be made.");
        }

        const orchestratorOptions: OrchestratorOptions = {
            name: workflow.name,
            dryRun: options.dryRun ?? false,
            executionId: context.executionId,
            rollbackStrategy: "reverse",
        };

        const orchestratorResult = TaskOrchestratorService.fromWorkflow(
            workflow,
            context as OrchestrationContext,
            orchestratorOptions,
        );

        if (orchestratorResult.isErr()) {
            logger.error("Failed to initialize the task orchestrator", orchestratorResult.error);
            return;
        }
        const orchestrator = orchestratorResult.value;

        const result = await orchestrator.run();

        if (result.isErr()) {
            this.logFailure(workflow.name, "Workflow execution failed unexpectedly.", result.error);
            return;
        }

        const workflowResult = result.value;
        if (workflowResult.success) {
            this.logSuccess(workflowResult);
        } else {
            this.logFailure(workflow.name, "Workflow execution failed.", workflowResult.error, workflowResult);
        }
    }

    /**
     * Logs a success message and details.
     */
    private logSuccess(result: WorkflowResult): void {
        logger.verbose("Execution summary:", {
            executionId: result.executionId,
            executedTasks: result.executedTasks,
            skippedTasks: result.skippedTasks,
        });
    }

    /**
     * Logs a failure message and details.
     */
    private logFailure(workflowName: string, message: string, error?: FireflyError, result?: WorkflowResult): void {
        logger.error(message);

        if (result != null) {
            logger.error(`Workflow '${workflowName}' failed after ${result.executionTime}ms.`);
            logger.info("Execution summary:", {
                executionId: result.executionId,
                executedTasks: result.executedTasks,
                failedTasks: result.failedTasks,
                skippedTasks: result.skippedTasks,
                rollbackExecuted: result.rollbackExecuted,
            });
        }

        if (error) {
            logger.error("Reason:", error);
        }

        process.exitCode = 1;
    }
}
