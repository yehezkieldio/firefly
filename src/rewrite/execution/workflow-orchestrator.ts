import { errAsync, okAsync } from "neverthrow";
import type { Command } from "#/rewrite/command-registry/command-types";
import { ImmutableWorkflowContext } from "#/rewrite/context/workflow-context";
import type { WorkflowExecutionResult } from "#/rewrite/execution/workflow-executor";
import { WorkflowExecutor, type WorkflowExecutorOptions } from "#/rewrite/execution/workflow-executor";
import { TaskRegistry } from "#/rewrite/task-system/task-registry";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Workflow orchestrator options.
 */
export interface WorkflowOrchestratorOptions extends WorkflowExecutorOptions {
    /**
     * Verbose logging.
     */
    readonly verbose?: boolean;
}

/**
 * High-level workflow orchestrator.
 * Coordinates command execution, task building, and workflow execution.
 */
export class WorkflowOrchestrator {
    private readonly options: WorkflowOrchestratorOptions;

    constructor(options: WorkflowOrchestratorOptions = {}) {
        this.options = options;
    }

    /**
     * Execute a command workflow.
     */
    executeCommand<TConfig, TData extends Record<string, unknown> = Record<string, unknown>>(
        command: Command<TConfig, TData>,
        config: TConfig,
        initialData?: Partial<TData>,
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        logger.verbose(`WorkflowOrchestrator: Executing command "${command.meta.name}"`);

        // Create immutable context
        const context = ImmutableWorkflowContext.create<TConfig, TData>(config, initialData);

        // Execute beforeExecute hook
        const beforeExecutePromise = command.beforeExecute
            ? command.beforeExecute(context)
            : okAsync<void, never>(undefined);

        return beforeExecutePromise
            .andThen(() => {
                // Build tasks from command
                logger.verbose(`WorkflowOrchestrator: Building tasks for "${command.meta.name}"`);
                return command.buildTasks(context);
            })
            .andThen((tasks) => {
                if (tasks.length === 0) {
                    return errAsync(
                        createFireflyError({
                            code: "VALIDATION",
                            message: `Command "${command.meta.name}" returned no tasks`,
                            source: "rewrite/execution/workflow-orchestrator",
                        }),
                    );
                }

                logger.verbose(`WorkflowOrchestrator: Built ${tasks.length} tasks`);

                // Register tasks and build execution order
                const taskRegistry = new TaskRegistry();
                const registerResult = taskRegistry.registerAll(tasks);

                if (registerResult.isErr()) {
                    return errAsync(registerResult.error);
                }

                const orderedTasksResult = taskRegistry.buildExecutionOrder();
                if (orderedTasksResult.isErr()) {
                    return errAsync(orderedTasksResult.error);
                }

                const orderedTasks = orderedTasksResult.value;
                logger.verbose(
                    `WorkflowOrchestrator: Task execution order: ${orderedTasks.map((t) => t.meta.id).join(" -> ")}`,
                );

                // Execute workflow
                const executor = new WorkflowExecutor(this.options);
                return executor.execute<TConfig, TData>(orderedTasks, context);
            })
            .andThen((result) => {
                // Execute afterExecute hook
                if (command.afterExecute) {
                    return command.afterExecute(result, context).map(() => result);
                }
                return okAsync(result);
            })
            .orElse((error) => {
                // Execute error handler
                if (command.onError) {
                    return command
                        .onError(new Error(error.message), context)
                        .andThen(() =>
                            errAsync(
                                createFireflyError({
                                    code: "FAILED",
                                    message: error.message,
                                    source: "rewrite/execution/workflow-orchestrator",
                                    cause: error,
                                }),
                            ),
                        )
                        .orElse(() =>
                            errAsync(
                                createFireflyError({
                                    code: "FAILED",
                                    message: error.message,
                                    source: "rewrite/execution/workflow-orchestrator",
                                    cause: error,
                                }),
                            ),
                        );
                }
                return errAsync(error);
            });
    }
}
