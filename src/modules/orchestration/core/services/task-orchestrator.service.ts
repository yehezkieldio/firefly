import type { IExecutionStrategy } from "#/modules/orchestration/core/contracts/execution-strategy.interface";
import {
    type OrchestrationContext,
    type OrchestratorOptions,
    OrchestratorOptionsSchema,
} from "#/modules/orchestration/core/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/core/contracts/task.interface";
import type { Workflow, WorkflowResult } from "#/modules/orchestration/core/contracts/workflow.interface";
import { FeatureManager } from "#/modules/orchestration/core/services/feature-manager.service";
import { createExecutionStrategy } from "#/modules/orchestration/core/strategies/execution-strategy.factory";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { withErrorContext } from "#/shared/utils/error-factory.util";
import {
    type FireflyAsyncResult,
    type FireflyResult,
    fireflyErr,
    fireflyErrAsync,
    fireflyOk,
} from "#/shared/utils/result.util";
import { validateWithResult } from "#/shared/utils/result-factory.util";

export class TaskOrchestratorService {
    private readonly tasks: readonly Task[];
    private readonly context?: OrchestrationContext;
    private readonly options: OrchestratorOptions;
    private readonly executionStrategy: IExecutionStrategy;
    private readonly executionId: string;
    private readonly featureManager: FeatureManager;

    private constructor(tasks: readonly Task[], options: OrchestratorOptions, context?: OrchestrationContext) {
        this.tasks = tasks;
        this.options = options;
        this.context = context;
        this.executionId = this.options.executionId ?? "unknown";
        this.executionId = options.executionId ?? Bun.randomUUIDv7();

        this.featureManager = new FeatureManager(options);
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

        // Validate task dependencies and features
        const validationResult = TaskOrchestratorService.validateTaskConfiguration(tasks, validatedOptionsResult.value);
        if (validationResult.isErr()) {
            return fireflyErr(validationResult.error);
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

        // Validate task dependencies and features
        const validationResult = TaskOrchestratorService.validateTaskConfiguration(
            tasksResult.value,
            validatedOptionsResult.value,
        );
        if (validationResult.isErr()) {
            return fireflyErr(validationResult.error);
        }

        return fireflyOk(new TaskOrchestratorService(tasksResult.value, validatedOptionsResult.value, context));
    }

    /**
     * Run the orchestration using the configured execution strategy.
     */
    run(): FireflyAsyncResult<WorkflowResult> {
        logger.verbose(`TaskOrchestratorService: Starting orchestration (${this.executionId})`);

        // Resolve task dependencies and order execution
        const orderedTasksResult = this.resolveDependencies();
        if (orderedTasksResult.isErr()) {
            const error = withErrorContext(orderedTasksResult.error, "Dependency resolution failed");
            logger.error(`TaskOrchestratorService: Failed to resolve dependencies (${this.executionId})`, error);
            return fireflyErrAsync(error);
        }

        // Filter tasks based on enabled features
        const enabledTasksResult = this.filterTasksByFeatures(orderedTasksResult.value);
        if (enabledTasksResult.isErr()) {
            const error = withErrorContext(enabledTasksResult.error, "Feature filtering failed");
            logger.error(`TaskOrchestratorService: Feature filtering failed (${this.executionId})`, error);
            return fireflyErrAsync(error);
        }

        // Delegate execution to the strategy
        return this.executionStrategy
            .execute(enabledTasksResult.value, this.context)
            .map((result) => {
                logger.verbose(
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

    /**
     * Validate task configuration including dependencies and features.
     */
    private static validateTaskConfiguration(tasks: Task[], _options: OrchestratorOptions): FireflyResult<void> {
        const taskIds = new Set(tasks.map((t) => t.id));
        const errors: string[] = [];

        for (const task of tasks) {
            // Validate dependencies exist
            for (const dep of task.getDependencies()) {
                if (!taskIds.has(dep)) {
                    errors.push(`Task ${task.id} depends on non-existent task: ${dep}`);
                }
            }

            // Check for circular dependencies
            const visited = new Set<string>();
            const recursionStack = new Set<string>();

            const hasCircularDep = (taskId: string): boolean => {
                if (recursionStack.has(taskId)) return true;
                if (visited.has(taskId)) return false;

                visited.add(taskId);
                recursionStack.add(taskId);

                const currentTask = tasks.find((t) => t.id === taskId);
                if (currentTask) {
                    for (const dep of currentTask.getDependencies()) {
                        if (hasCircularDep(dep)) return true;
                    }
                }

                recursionStack.delete(taskId);
                return false;
            };

            if (hasCircularDep(task.id)) {
                errors.push(`Circular dependency detected for task: ${task.id}`);
            }
        }

        if (errors.length > 0) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: "Task configuration validation failed",
                    details: { errors },
                    source: "application",
                }),
            );
        }

        return fireflyOk();
    }

    /**
     * Resolve task dependencies and return tasks in execution order.
     */
    private resolveDependencies(): FireflyResult<Task[]> {
        const taskMap = new Map(this.tasks.map((task) => [task.id, task]));
        const resolved: Task[] = [];
        const resolving = new Set<string>();
        const resolved_ids = new Set<string>();

        const resolveDependenciesRecursive = (taskId: string): FireflyResult<void> => {
            if (resolved_ids.has(taskId)) {
                return fireflyOk();
            }

            if (resolving.has(taskId)) {
                return fireflyErr(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Circular dependency detected for task: ${taskId}`,
                        source: "application",
                    }),
                );
            }

            const task = taskMap.get(taskId);
            if (!task) {
                return fireflyErr(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task not found: ${taskId}`,
                        source: "application",
                    }),
                );
            }

            resolving.add(taskId);

            // Resolve all dependencies first
            for (const depId of task.getDependencies()) {
                const result = resolveDependenciesRecursive(depId);
                if (result.isErr()) {
                    return result;
                }
            }

            resolving.delete(taskId);
            resolved_ids.add(taskId);
            resolved.push(task);

            return fireflyOk();
        };

        // Resolve all tasks
        for (const task of this.tasks) {
            const result = resolveDependenciesRecursive(task.id);
            if (result.isErr()) {
                return fireflyErr(result.error);
            }
        }

        logger.verbose(`TaskOrchestratorService: Resolved dependencies for ${resolved.length} tasks`);
        return fireflyOk(resolved);
    }

    /**
     * Filter tasks based on enabled features.
     */
    private filterTasksByFeatures(tasks: Task[]): FireflyResult<Task[]> {
        const enabledFeatures = this.featureManager.getEnabledFeatures();
        const filteredTasks: Task[] = [];

        for (const task of tasks) {
            const requiredFeatures = task.getRequiredFeatures();

            if (requiredFeatures.length === 0 || task.isEnabled(enabledFeatures)) {
                filteredTasks.push(task);
            } else {
                logger.verbose(
                    `TaskOrchestratorService: Task ${task.name} disabled due to missing features: ${requiredFeatures.join(", ")}`,
                );
            }
        }

        logger.verbose(`TaskOrchestratorService: Filtered to ${filteredTasks.length} enabled tasks`);
        return fireflyOk(filteredTasks);
    }
}
