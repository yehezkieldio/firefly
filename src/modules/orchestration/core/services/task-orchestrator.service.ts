import type { IExecutionStrategy } from "#/modules/orchestration/core/contracts/execution-strategy.interface";
import {
    type OrchestrationContext,
    type OrchestratorOptions,
    OrchestratorOptionsSchema,
} from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { Workflow, WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import { createExecutionStrategy } from "#/modules/orchestration/core/strategies/execution-strategy.factory";
import { logger } from "#/shared/logger";
import { withErrorContext } from "#/shared/utils/error-factory.util";
import { type FireflyAsyncResult, type FireflyResult, fireflyErr, fireflyOk } from "#/shared/utils/result.util";
import { validateWithResult } from "#/shared/utils/result-factory.util";

export class TaskOrchestratorService {
    private readonly tasks: readonly Task[];
    private readonly context?: OrchestrationContext;
    private readonly options: OrchestratorOptions;
    private readonly executionStrategy: IExecutionStrategy;
    private readonly executionId: string;

    private constructor(tasks: readonly Task[], options: OrchestratorOptions, context?: OrchestrationContext) {
        this.tasks = tasks;
        this.options = options;
        this.context = context;
        this.executionId = this.options.executionId ?? "unknown";
        this.executionId = options.executionId ?? Bun.randomUUIDv7();

        this.executionStrategy = createExecutionStrategy(this.options);
    }

    /**
     * Create orchestrator from a list of tasks.
     */
    static fromTasks(
        tasks: Task[],
        context?: OrchestrationContext,
        options: Partial<OrchestratorOptions> = {},
    ): FireflyResult<TaskOrchestratorService> {
        const validatedOptionsResult = TaskOrchestratorService.validateOptions(options);
        if (validatedOptionsResult.isErr()) {
            return fireflyErr(validatedOptionsResult.error);
        }

        logger.verbose(`TaskOrchestratorService: Creating orchestrator from ${tasks.length} tasks`);
        return fireflyOk(new TaskOrchestratorService(tasks, validatedOptionsResult.value, context));
    }

    /**
     * Create orchestrator from a workflow.
     */
    static fromWorkflow(
        workflow: Workflow,
        context?: OrchestrationContext,
        options: Partial<OrchestratorOptions> = {},
    ): FireflyResult<TaskOrchestratorService> {
        const validatedOptionsResult = TaskOrchestratorService.validateOptions(options);
        if (validatedOptionsResult.isErr()) {
            return fireflyErr(validatedOptionsResult.error);
        }

        // Build tasks from workflow
        const tasksResult = workflow.buildTasks(context ?? ({} as OrchestrationContext));
        if (tasksResult.isErr()) {
            return fireflyErr(withErrorContext(tasksResult.error, "Failed to build tasks from workflow"));
        }

        return fireflyOk(new TaskOrchestratorService(tasksResult.value, validatedOptionsResult.value, context));
    }

    /**
     * Run the orchestration using the configured execution strategy.
     */
    run(): FireflyAsyncResult<WorkflowResult> {
        logger.info(`TaskOrchestratorService: Starting orchestration (${this.executionId})`);

        // Delegate execution to the strategy
        return this.executionStrategy
            .execute(this.tasks, this.context)
            .map((result) => {
                logger.info(
                    `TaskOrchestratorService: Orchestration completed (${this.executionId}) - Success: ${result.success}`,
                );
                return result;
            })
            .mapErr((error) => {
                logger.error(`TaskOrchestratorService: Orchestration failed (${this.executionId})`, error);
                return withErrorContext(error, "Orchestration execution failed");
            });
    }

    /**
     * Validate orchestrator options.
     */
    private static validateOptions(options: Partial<OrchestratorOptions>): FireflyResult<OrchestratorOptions> {
        const result = validateWithResult(OrchestratorOptionsSchema, options, "options");
        if (result.isErr()) {
            return fireflyErr(withErrorContext(result.error, "Invalid orchestrator options"));
        }

        return fireflyOk(result.value);
    }

    /**
     * Get the execution ID.
     */
    getExecutionId(): string {
        return this.executionId;
    }
}
