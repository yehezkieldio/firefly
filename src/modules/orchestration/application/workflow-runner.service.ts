import { LogLevels } from "consola";
import { ApplicationContext } from "#/application/context";
import type {
    OrchestrationContext,
    OrchestratorOptions,
    RollbackStrategy,
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
    enabledFeatures?: string[];
    rollbackStrategy?: RollbackStrategy;
    continueOnError?: boolean;
    [key: string]: unknown;
}

/**
 * A service responsible for initializing and running a workflow.
 * It acts as a bridge between the CLI and the task orchestration engine.
 */
export class WorkflowRunnerService {
    private currentOrchestrator?: TaskOrchestratorService;
    private currentWorkflow?: Workflow;

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

        this.currentWorkflow = workflowFactory(context);
        if (options.dryRun) {
            logger.warn("Running in dry-run mode. No actual changes will be made.");
        }

        const orchestratorOptions: OrchestratorOptions = {
            name: this.currentWorkflow.name,
            dryRun: options.dryRun ?? false,
            executionId: context.executionId,
            rollbackStrategy: options.rollbackStrategy ?? "reverse",
            enabledFeatures: options.enabledFeatures ? new Set(options.enabledFeatures) : undefined,
        };

        // Execute workflow hooks if available
        if (this.currentWorkflow.beforeExecute) {
            const beforeResult = await this.currentWorkflow.beforeExecute(context as OrchestrationContext);
            if (beforeResult.isErr()) {
                logger.error("Workflow beforeExecute hook failed", beforeResult.error);
                return;
            }
        }

        const orchestratorResult = TaskOrchestratorService.fromWorkflow(
            this.currentWorkflow,
            context as OrchestrationContext,
            orchestratorOptions,
        );
        if (orchestratorResult.isErr()) {
            logger.error("Failed to initialize the task orchestrator", orchestratorResult.error);
            return;
        }

        this.currentOrchestrator = orchestratorResult.value;
        const result = await this.currentOrchestrator.run();

        if (result.isErr()) {
            await this.handleWorkflowError(this.currentWorkflow, result.error, context as OrchestrationContext);
            this.logFailure(this.currentWorkflow.name, "Workflow execution failed unexpectedly.", result.error);
            return;
        }

        const workflowResult = result.value;

        if (this.currentWorkflow.afterExecute) {
            const afterResult = await this.currentWorkflow.afterExecute(
                workflowResult,
                context as OrchestrationContext,
            );
            if (afterResult.isErr()) {
                logger.warn("Workflow afterExecute hook failed", afterResult.error);
            }
        }

        if (workflowResult.success) {
            this.logSuccess(workflowResult);
        } else {
            await this.handleWorkflowError(this.currentWorkflow, workflowResult.error, context as OrchestrationContext);
            this.logFailure(
                this.currentWorkflow.name,
                "Workflow execution failed.",
                workflowResult.error,
                workflowResult,
            );
        }
    }

    /**
     * Pause the current workflow execution.
     */
    async pause(): Promise<void> {
        if (!this.currentWorkflow) {
            logger.warn("No workflow is currently running");
            return;
        }

        logger.info("Pausing workflow execution...");
        const pauseResult = await this.currentWorkflow.pause();
        if (pauseResult.isErr()) {
            logger.error("Failed to pause workflow", pauseResult.error);
        } else {
            logger.info("Workflow paused successfully");
        }
    }

    /**
     * Resume the current workflow execution.
     */
    async resume(): Promise<void> {
        if (!this.currentWorkflow) {
            logger.warn("No workflow is currently paused");
            return;
        }

        logger.info("Resuming workflow execution...");
        const resumeResult = await this.currentWorkflow.resume();
        if (resumeResult.isErr()) {
            logger.error("Failed to resume workflow", resumeResult.error);
        } else {
            logger.info("Workflow resumed successfully");
        }
    }

    /**
     * Cancel the current workflow execution.
     */
    async cancel(): Promise<void> {
        if (!this.currentWorkflow) {
            logger.warn("No workflow is currently running");
            return;
        }

        logger.info("Cancelling workflow execution...");
        const cancelResult = await this.currentWorkflow.cancel();
        if (cancelResult.isErr()) {
            logger.error("Failed to cancel workflow", cancelResult.error);
        } else {
            logger.info("Workflow cancelled successfully");
        }
    }

    /**
     * Handle workflow errors using the onError hook if available.
     */
    private async handleWorkflowError(
        workflow: Workflow,
        error?: FireflyError,
        context?: OrchestrationContext,
    ): Promise<void> {
        if (error && workflow.onError && context) {
            logger.verbose("Executing workflow error handler...");
            const errorResult = await workflow.onError(error, context);
            if (errorResult.isErr()) {
                logger.warn("Workflow error handler failed", errorResult.error);
            }
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
