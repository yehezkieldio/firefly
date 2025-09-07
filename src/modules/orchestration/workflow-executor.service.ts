import { LogLevels } from "consola";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import type { ContextDataFor } from "#/modules/orchestration/contracts/context-data";
import type {
    OrchestrationContext,
    OrchestratorOptions,
    RollbackStrategy,
} from "#/modules/orchestration/contracts/orchestration.interface";
import type { Workflow, WorkflowResult } from "#/modules/orchestration/contracts/workflow.interface";
import { ScopedContextService } from "#/modules/orchestration/scoped-context.service";
import { TaskOrchestratorService } from "#/modules/orchestration/task-orchestrator.service";
import { logger } from "#/shared/logger";
import type { FireflyError } from "#/shared/utils/error.util";

export type WorkflowFactory<TCommand extends CommandName> = () => Workflow<TCommand>;

export interface WorkflowExecutorOptions {
    dryRun?: boolean;
    verbose?: boolean;
    enabledFeatures?: string[];
    rollbackStrategy?: RollbackStrategy;
    continueOnError?: boolean;
    config?: unknown;
    [key: string]: unknown;
}

export class WorkflowExecutorService {
    private orchestrator?: TaskOrchestratorService;

    private logSuccess(result: WorkflowResult): void {
        const summary = {
            executionId: result.executionId,
            executedTasks: result.executedTasks,
            skippedTasks: result.skippedTasks,
        };
        logger.verbose("");
        logger.verbose(JSON.stringify(summary, null, 2));
    }

    async run<TCommand extends CommandName>(
        command: TCommand,
        options: WorkflowExecutorOptions,
        workflowFactory: WorkflowFactory<TCommand>,
    ): Promise<void> {
        const executionId = Bun.randomUUIDv7();
        const startTime = new Date();

        const contextResult = ScopedContextService.create<TCommand>(command, {
            command,
            executionId,
            startTime,
            config: options.config,
            ...options,
        });
        if (contextResult.isErr()) {
            logger.error("Failed to create application context", contextResult.error);
            return;
        }

        const context = contextResult.value;
        logger.verbose(`WorkflowRunnerService: Workflow runner started with execution ID: ${context.executionId}`);

        if (options.verbose) {
            logger.level = LogLevels.verbose;
        }

        const workflow = workflowFactory();

        if (workflow.command !== command) {
            logger.error(`Workflow command '${workflow.command}' does not match expected command '${command}'`);
            return;
        }

        if (options.dryRun) {
            logger.warn("Running in dry-run mode. No actual changes will be made.");
        }

        const orchestratorOptions: OrchestratorOptions = {
            name: workflow.name,
            dryRun: options.dryRun ?? false,
            executionId: context.executionId,
            rollbackStrategy: options.rollbackStrategy ?? "reverse",
            featureFlags: options.enabledFeatures
                ? new Map(options.enabledFeatures.map((feature) => [feature, true] as const))
                : undefined,
        };

        if (workflow.beforeExecute) {
            const beforeResult = await workflow.beforeExecute(context);
            if (beforeResult.isErr()) {
                logger.error("Workflow beforeExecute hook failed", beforeResult.error);
                return;
            }
        }

        const orchestratorResult = TaskOrchestratorService.fromWorkflow(workflow, context, orchestratorOptions);

        if (orchestratorResult.isErr()) {
            logger.error("Failed to initialize the task orchestrator", orchestratorResult.error);
            return;
        }

        this.orchestrator = orchestratorResult.value;
        const result = await this.orchestrator.run();

        if (result.isErr()) {
            await this.handleWorkflowError(workflow, result.error, context);
            this.logFailure(workflow.name, "Workflow execution failed unexpectedly.", result.error);
            return;
        }

        const workflowResult = result.value;

        if (workflow.afterExecute) {
            const afterResult = await workflow.afterExecute(workflowResult, context);
            if (afterResult.isErr()) {
                logger.warn("Workflow afterExecute hook failed", afterResult.error);
            }
        }

        if (workflowResult.success) {
            this.logSuccess(workflowResult);
        } else {
            await this.handleWorkflowError(workflow, workflowResult.error, context);
            this.logFailure(workflow.name, "Workflow execution failed.", workflowResult.error, workflowResult);
        }
    }

    private async handleWorkflowError<TCommand extends CommandName>(
        workflow: Workflow<TCommand>,
        error?: FireflyError,
        context?: OrchestrationContext<ContextDataFor<TCommand>, TCommand>,
    ): Promise<void> {
        if (error && workflow.onError && context) {
            logger.verbose("Executing workflow error handler...");
            const errorResult = await workflow.onError(error, context);
            if (errorResult.isErr()) {
                logger.warn("Workflow error handler failed", errorResult.error);
            }
        }
    }

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
