import { err, errAsync, ok } from "neverthrow";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import type { ContextDataFor } from "#/modules/orchestration/contracts/context-data";
import type { IExecutionStrategy } from "#/modules/orchestration/contracts/execution-strategy.interface";
import {
    type OrchestrationContext,
    type OrchestratorOptions,
    OrchestratorOptionsSchema,
} from "#/modules/orchestration/contracts/orchestration.interface";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow, WorkflowResult } from "#/modules/orchestration/contracts/workflow.interface";
import { FeatureManagerService } from "#/modules/orchestration/feature-manager.service";
import { createExecutionStrategy } from "#/modules/orchestration/strategies/execution-strategy.factory";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyAsyncResult, type FireflyResult, parseSchema } from "#/shared/utils/result.util";

export class TaskOrchestratorService {
    private readonly tasks: readonly Task[];
    private readonly context?: OrchestrationContext;
    private readonly options: OrchestratorOptions;
    private readonly executionStrategy: IExecutionStrategy;
    private readonly executionId: string;
    private readonly featureManager!: FeatureManagerService;

    private constructor(tasks: readonly Task[], options: OrchestratorOptions, context?: OrchestrationContext) {
        this.tasks = tasks;
        this.options = options;
        this.context = context;
        this.executionId = options.executionId ?? Bun.randomUUIDv7();

        const featureManager = FeatureManagerService.create(options);
        if (featureManager.isOk()) {
            this.featureManager = featureManager.value;
        }

        this.executionStrategy = createExecutionStrategy(this.options);
    }

    static fromTasks(
        tasks: Task[],
        context?: OrchestrationContext,
        options: Partial<OrchestratorOptions> = {},
    ): FireflyResult<TaskOrchestratorService> {
        const validateOptions = TaskOrchestratorService.validateOptions(options);
        if (validateOptions.isErr()) {
            return err(validateOptions.error);
        }

        const validateOptionsTaskConfig = TaskOrchestratorService.validateTaskConfiguration(tasks);
        if (validateOptionsTaskConfig.isErr()) {
            return err(validateOptionsTaskConfig.error);
        }

        logger.verbose(`TaskOrchestratorService: Initialized with ${tasks.length} tasks.`);
        return ok(new TaskOrchestratorService(tasks, validateOptions.value, context));
    }

    static fromWorkflow<TCommand extends CommandName = CommandName>(
        workflow: Workflow<TCommand>,
        context: OrchestrationContext<ContextDataFor<TCommand>, TCommand>,
        options: Partial<OrchestratorOptions> = {},
    ): FireflyResult<TaskOrchestratorService> {
        logger.verbose(`TaskOrchestratorService: Building tasks from workflow '${workflow.id}'.`);

        const validateOptions = TaskOrchestratorService.validateOptions(options);
        if (validateOptions.isErr()) {
            return err(validateOptions.error);
        }

        const tasks = workflow.buildTasks(context);
        if (tasks.isErr()) {
            return err(tasks.error);
        }

        const validateOptionsTaskConfig = TaskOrchestratorService.validateTaskConfiguration(tasks.value);
        if (validateOptionsTaskConfig.isErr()) {
            return err(validateOptionsTaskConfig.error);
        }

        return ok(new TaskOrchestratorService(tasks.value, validateOptions.value, context));
    }

    run(): FireflyAsyncResult<WorkflowResult> {
        logger.verbose(`TaskOrchestratorService: Starting orchestration for execution ID: ${this.executionId}`);

        const enabledTasks = this.filterTasksByFeatures(Array.from(this.tasks));
        if (enabledTasks.isErr()) {
            return errAsync(enabledTasks.error);
        }

        return this.executionStrategy
            .execute(enabledTasks.value, this.context)
            .map((result) => {
                logger.verbose(
                    `TaskOrchestratorService: Orchestration completed for execution ID: ${this.executionId}`,
                );
                return result;
            })
            .mapErr((error) => {
                logger.error(
                    `TaskOrchestratorService: Orchestration failed for execution ID: ${this.executionId}`,
                    error,
                );
                return error;
            });
    }

    private static validateOptions(options: Partial<OrchestratorOptions>): FireflyResult<OrchestratorOptions> {
        const validation = parseSchema(OrchestratorOptionsSchema, options);
        if (validation.isErr()) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Invalid orchestrator options: ${validation.error.message}`,
                    source: "orchestration/task-orchestrator-service",
                }),
            );
        }

        return ok(validation.value);
    }

    getExecutionId(): string {
        return this.executionId;
    }

    private static validateTaskConfiguration(tasks: Task[]): FireflyResult<void> {
        const taskIds = new Set(tasks.map((task) => task.id));
        const errors: string[] = [];

        for (const task of tasks) {
            for (const depId of task.getDependencies?.() ?? []) {
                if (!taskIds.has(depId)) {
                    errors.push(`Task ${task.id} has a missing dependency: ${depId}`);
                }
            }

            for (const depId of task.getDependents?.() ?? []) {
                if (!taskIds.has(depId)) {
                    errors.push(`Task ${task.id} has a missing dependent: ${depId}`);
                }
            }
        }

        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCircularDependency = (taskId: string): boolean => {
            if (recursionStack.has(taskId)) return true;
            if (visited.has(taskId)) return false;

            visited.add(taskId);
            recursionStack.add(taskId);

            const currentTask = tasks.find((t) => t.id === taskId);
            if (currentTask) {
                for (const neighbor of currentTask.getDependencies?.() ?? []) {
                    if (hasCircularDependency(neighbor)) return true;
                }
            }

            recursionStack.delete(taskId);
            return false;
        };

        for (const task of tasks) {
            if (hasCircularDependency(task.id)) {
                errors.push(`Task ${task.id} is part of a circular dependency in static dependencies`);
            }
        }

        if (errors.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task configuration errors:\n${errors.join("\n")}`,
                    source: "orchestration/task-orchestrator-service",
                }),
            );
        }

        return ok();
    }

    private filterTasksByFeatures(tasks: Task[]): FireflyResult<Task[]> {
        const enabledFeatures = this.featureManager.getEnabledFeatures();
        const filteredTasks: Task[] = [];

        for (const task of tasks) {
            const requiredFeatures = task.getRequiredFeatures?.() ?? [];

            if (requiredFeatures.length === 0 || task.isEnabled?.(enabledFeatures)) {
                filteredTasks.push(task);
            } else {
                logger.verbose(
                    `TaskOrchestratorService: Task ${task.name} disabled due to missing features: ${requiredFeatures.join(", ")}`,
                );
            }
        }

        return ok(filteredTasks);
    }
}
