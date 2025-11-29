/**
 * Workflow Orchestrator Module
 *
 * High-level orchestration of command execution. The orchestrator:
 * - Creates workflow contexts with resolved services
 * - Manages command lifecycle hooks (beforeExecute, afterExecute, onError)
 * - Builds and orders tasks from commands
 * - Delegates task execution to WorkflowExecutor
 *
 * @module execution/workflow-orchestrator
 */

import { errAsync, okAsync } from "neverthrow";
import type { Command } from "#/command-registry/command-types";
import { ImmutableWorkflowContext, type WorkflowContext } from "#/context/workflow-context";
import {
    type WorkflowExecutionResult,
    WorkflowExecutor,
    type WorkflowExecutorOptions,
} from "#/execution/workflow-executor";
import {
    type ResolvedServices,
    resolveServices,
    type ServiceKey,
    type ServiceKeys,
    type ServiceKeysFromArray,
} from "#/services/service-registry";
import { TaskRegistry } from "#/task-system/task-registry";
import type { Task } from "#/task-system/task-types";
import { type FireflyError, failedError, wrapErrorMessage } from "#/utils/error";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, validationErrAsync } from "#/utils/result";

// ============================================================================
// Orchestrator Options
// ============================================================================

/**
 * Configuration options for the workflow orchestrator.
 * Extends executor options with orchestrator-specific settings.
 */
export interface WorkflowOrchestratorOptions extends WorkflowExecutorOptions {
    /** Enable verbose logging of orchestrator operations */
    readonly verbose?: boolean;
    /** Base path for service instantiation (defaults to cwd) */
    readonly basePath?: string;
}

// ============================================================================
// Internal Types
// ============================================================================

/** Resolved services type based on command requirements */
type CommandServices<TServices extends ServiceKeys> = ResolvedServices<ServiceKeysFromArray<TServices>>;

// ============================================================================
// WorkflowOrchestrator Class
// ============================================================================

/**
 * Orchestrates the execution of workflow commands.
 *
 * The orchestrator is the main entry point for executing commands.
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

    /** Creates a workflow context with resolved services for the command */
    private createContext<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        config: TConfig,
        initialData?: Partial<TData>
    ): WorkflowContext<TConfig, TData, CommandServices<TServices>> {
        const basePath = this.options.basePath ?? process.cwd();
        const requiredServices = command.meta.requiredServices;
        const services = resolveServices(requiredServices, basePath) as CommandServices<TServices>;

        logger.verbose(`WorkflowOrchestrator: Resolved services: [${requiredServices.join(", ")}]`);

        return ImmutableWorkflowContext.create<TConfig, TData, CommandServices<TServices>>(
            config,
            services,
            initialData
        );
    }

    /** Runs the complete command lifecycle: before → tasks → after / error */
    private runCommandLifecycle<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        const beforeExecute = command.beforeExecute ? command.beforeExecute(context) : okAsync<void, never>(undefined);

        return beforeExecute
            .andThen(() => this.buildAndOrderTasks(command, context))
            .andThen((tasks) => new WorkflowExecutor(this.options).execute(tasks, context))
            .andThen((result) => this.runAfterExecute(command, context, result))
            .orElse((error) => this.handleCommandError(command, context, error));
    }

    /** Runs the afterExecute hook if defined */
    private runAfterExecute<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>,
        result: WorkflowExecutionResult
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        if (!command.afterExecute) return okAsync(result);
        return command.afterExecute(result, context).map(() => result);
    }

    /** Handles errors by calling onError hook and wrapping the error */
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

        if (!command.onError) return errAsync(error);

        return command
            .onError(new Error(error.message), context)
            .andThen(() => errAsync(wrappedError))
            .orElse(() => errAsync(wrappedError));
    }

    /** Builds tasks from command and orders them by dependencies */
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
            if (registerResult.isErr()) return errAsync(registerResult.error);

            const orderedTasksResult = taskRegistry.buildExecutionOrder();
            if (orderedTasksResult.isErr()) return errAsync(orderedTasksResult.error);

            const orderedTasks = orderedTasksResult.value;
            logger.verbose(
                `WorkflowOrchestrator: Task execution order: ${orderedTasks.map((t) => t.meta.id).join(" -> ")}`
            );

            return okAsync(orderedTasks);
        });
    }
}
