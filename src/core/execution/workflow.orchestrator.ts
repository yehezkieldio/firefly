import type { Command } from "#/core/command/command.types";
import { ImmutableWorkflowContext, type WorkflowContext } from "#/core/context/workflow.context";
import { Workspace } from "#/core/environment/workspace";
import {
    type WorkflowExecutionResult,
    WorkflowExecutor,
    type WorkflowExecutorOptions,
} from "#/core/execution/workflow.executor";
import { TaskRegistry } from "#/core/registry/task.registry";
import { failedError, wrapErrorMessage } from "#/core/result/error.factories";
import type { FireflyError } from "#/core/result/error.types";
import { FireflyErrAsync, FireflyOkAsync, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { resolveServices } from "#/core/service/service.proxy";
import type { ResolvedServices, ServiceKey, ServiceKeys, ServiceKeysFromArray } from "#/core/service/service.registry";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

/**
 * Configuration options for the workflow orchestrator.
 * Extends executor options with orchestrator-specific settings.
 */
export interface WorkflowOrchestratorOptions extends WorkflowExecutorOptions {
    /**
     * Enable verbose logging of orchestrator operations
     */
    readonly verbose?: boolean;
    /**
     * The workspace for the workflow execution.
     * Provides the base path for all file operations and service instantiation.
     */
    readonly workspace?: Workspace;
}

// Resolved services type based on command requirements
type CommandServices<TServices extends ServiceKeys> = ResolvedServices<ServiceKeysFromArray<TServices>>;

/**
 * Orchestrates the execution of workflow commands.
 * The orchestrator is the main entry point for executing commands.
 *
 * It coordinates:
 * - Service resolution based on command requirements
 * - Context creation with configuration and initial data
 * - Task building, registration, and dependency ordering
 * - Command lifecycle hook execution
 * - Delegation to WorkflowExecutor for task execution
 *
 * @example
 * ```typescript
 * const orchestrator = new WorkflowOrchestrator({
 *   basePath: "/path/to/project",
 *   dryRun: false,
 *   enableRollback: true,
 * });
 *
 * const result = await orchestrator.executeCommand(
 *   releaseCommand,
 *   { version: "1.0.0", changelog: true },
 *   { previousVersion: "0.9.0" }
 * );
 *
 * if (result.isOk() && result.value.success) {
 *   console.log("Release completed successfully!");
 * }
 * ```
 */
export class WorkflowOrchestrator {
    private readonly options: WorkflowOrchestratorOptions;

    constructor(options: WorkflowOrchestratorOptions = {}) {
        this.options = options;
    }

    /**
     * Executes a command with the given configuration.
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command to execute
     * @param config - Configuration for the command
     * @param initialData - Optional initial data values
     * @returns Execution result with success/failure status
     */
    executeCommand<
        TConfig,
        TData extends Record<string, unknown> = Record<string, unknown>,
        TServices extends ServiceKeys = readonly ServiceKey[],
    >(
        command: Command<TConfig, TData, TServices>,
        config: TConfig,
        initialData?: Partial<TData>
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        logger.verbose(`WorkflowOrchestrator: Executing command "${command.meta.name}"`);

        const context = this.createContext(command, config, initialData);

        return this.runCommandLifecycle(command, context);
    }

    /**
     * Creates a workflow context with resolved services for the command.
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command for which to create the context
     * @param config - Configuration for the command
     * @param initialData - Optional initial data values
     * @returns The constructed workflow context
     */
    private createContext<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        config: TConfig,
        initialData?: Partial<TData>
    ): WorkflowContext<TConfig, TData, CommandServices<TServices>> {
        const workspace = this.options.workspace ?? Workspace.current();
        const requiredServices = command.meta.requiredServices;
        const services = resolveServices(requiredServices, workspace.basePath) as CommandServices<TServices>;

        logger.verbose(`WorkflowOrchestrator: Resolved services: [${requiredServices.join(", ")}]`);
        logger.verbose(`WorkflowOrchestrator: Using workspace: ${workspace.basePath}`);

        return ImmutableWorkflowContext.create<TConfig, TData, CommandServices<TServices>>(
            config,
            services,
            initialData,
            workspace
        );
    }

    /**
     * Runs the complete command lifecycle: before → tasks → after / error
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command to execute
     * @param context - The workflow context for execution
     * @returns Execution result with success/failure status
     */
    private runCommandLifecycle<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        const beforeExecute = command.beforeExecute ? command.beforeExecute(context) : FireflyOkAsync(undefined);

        return beforeExecute
            .andThen(() => this.buildAndOrderTasks(command, context))
            .andThen((tasks) => new WorkflowExecutor(this.options).execute(tasks, context))
            .andThen((result) => this.runAfterExecute(command, context, result))
            .orElse((error) => this.handleCommandError(command, context, error));
    }

    /**
     * Runs the afterExecute hook if defined
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command to execute
     * @param context - The workflow context for execution
     * @param result - The workflow execution result
     * @returns The original execution result wrapped in FireflyAsyncResult
     */
    private runAfterExecute<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>,
        result: WorkflowExecutionResult
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        if (!command.afterExecute) return FireflyOkAsync(result);
        return command.afterExecute(result, context).map(() => result);
    }

    /**
     * Handles errors by calling onError hook and wrapping the error
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command to execute
     * @param context - The workflow context for execution
     * @param error - The error that occurred
     * @returns A FireflyAsyncResult with the wrapped error
     */
    private handleCommandError<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>,
        error: FireflyError
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        const wrappedError = wrapErrorMessage(
            failedError({
                message: error.message,
                source: "WorkflowOrchestrator.executeCommand",
            }),
            "Command execution failed"
        );

        if (!command.onError) return FireflyErrAsync(error);

        return command
            .onError(new Error(error.message), context)
            .andThen(() => FireflyErrAsync(wrappedError))
            .orElse(() => FireflyErrAsync(wrappedError));
    }

    /**
     * Builds tasks from command and orders them by dependencies
     *
     * @template TConfig - Command configuration type
     * @template TData - Workflow data type
     * @template TServices - Required services tuple
     * @param command - The command to build tasks from
     * @param context - The workflow context for execution
     * @returns Ordered array of tasks wrapped in FireflyAsyncResult
     */
    private buildAndOrderTasks<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>
    ): FireflyAsyncResult<Task[]> {
        logger.verbose(`WorkflowOrchestrator: Building tasks for "${command.meta.name}"`);

        return command.buildTasks(context).andThen((tasks) => {
            if (tasks.length === 0) {
                return validationErrAsync({
                    message: `Command "${command.meta.name}" returned no tasks`,
                    source: "WorkflowOrchestrator.buildAndOrderTasks",
                });
            }

            logger.verbose(`WorkflowOrchestrator: Built ${tasks.length} tasks`);

            const taskRegistry = new TaskRegistry();
            const registerResult = taskRegistry.registerAll(tasks);
            if (registerResult.isErr()) return FireflyErrAsync(registerResult.error);

            const orderedTasksResult = taskRegistry.buildExecutionOrder();
            if (orderedTasksResult.isErr()) return FireflyErrAsync(orderedTasksResult.error);

            const orderedTasks = orderedTasksResult.value;
            // logger.verbose(
            //     `WorkflowOrchestrator: Task execution order: ${orderedTasks.map((t) => t.meta.id).join(" -> ")}`
            // );

            return FireflyOkAsync(orderedTasks);
        });
    }
}
