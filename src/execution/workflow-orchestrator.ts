import { errAsync, okAsync } from "neverthrow";
import type { Command } from "#/command-registry/command-types";
import { ImmutableWorkflowContext } from "#/context/workflow-context";
import {
    type WorkflowExecutionResult,
    WorkflowExecutor,
    type WorkflowExecutorOptions,
} from "#/execution/workflow-executor";
import { createFileSystemService } from "#/shared/fs";
import { createGitService } from "#/shared/git";
import type { WorkflowServices } from "#/shared/interfaces";
import { TaskRegistry } from "#/task-system/task-registry";
import type { Task } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

export interface WorkflowOrchestratorOptions extends WorkflowExecutorOptions {
    readonly verbose?: boolean;
    readonly basePath?: string;
    readonly services?: WorkflowServices;
}

export class WorkflowOrchestrator {
    private readonly options: WorkflowOrchestratorOptions;

    constructor(options: WorkflowOrchestratorOptions = {}) {
        this.options = options;
    }

    executeCommand<TConfig, TData extends Record<string, unknown> = Record<string, unknown>>(
        command: Command<TConfig, TData>,
        config: TConfig,
        initialData?: Partial<TData>
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        logger.verbose(`WorkflowOrchestrator: Executing command "${command.meta.name}"`);

        const basePath = this.options.basePath ?? process.cwd();
        const services = this.options.services ?? {
            fs: createFileSystemService(basePath),
            git: createGitService(basePath),
        };

        const context = ImmutableWorkflowContext.create<TConfig, TData>(config, services, initialData);

        // Execute beforeExecute hook
        const beforeExecutePromise = command.beforeExecute
            ? command.beforeExecute(context)
            : okAsync<void, never>(undefined);

        return beforeExecutePromise
            .andThen(() => this.buildAndOrderTasks(command, context))
            .andThen((orderedTasks) => {
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
                                })
                            )
                        )
                        .orElse(() =>
                            errAsync(
                                createFireflyError({
                                    code: "FAILED",
                                    message: error.message,
                                    source: "rewrite/execution/workflow-orchestrator",
                                    cause: error,
                                })
                            )
                        );
                }
                return errAsync(error);
            });
    }

    private buildAndOrderTasks<TConfig, TData extends Record<string, unknown> = Record<string, unknown>>(
        command: Command<TConfig, TData>,
        context: ImmutableWorkflowContext<TConfig, TData>
    ): FireflyAsyncResult<Task[]> {
        logger.verbose(`WorkflowOrchestrator: Building tasks for "${command.meta.name}"`);
        return command
            .buildTasks(context)
            .andThen((tasks) => {
                if (tasks.length === 0) {
                    return errAsync(
                        createFireflyError({
                            code: "VALIDATION",
                            message: `Command "${command.meta.name}" returned no tasks`,
                            source: "execution/workflow-orchestrator",
                        })
                    );
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
            })
            .map((r) => r);
    }
}
