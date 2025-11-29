import { errAsync, okAsync } from "neverthrow";
import type { Command } from "#/command-registry/command-types";
import { ImmutableWorkflowContext, type WorkflowContext } from "#/context/workflow-context";
import {
    type WorkflowExecutionResult,
    WorkflowExecutor,
    type WorkflowExecutorOptions,
} from "#/execution/workflow-executor";
import type { ResolvedServices, ServiceKey, ServiceKeys, ServiceKeysFromArray } from "#/shared/interfaces";
import { resolveServices } from "#/shared/service-resolver";
import { TaskRegistry } from "#/task-system/task-registry";
import type { Task } from "#/task-system/task-types";
import { createFireflyError, type FireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

export interface WorkflowOrchestratorOptions extends WorkflowExecutorOptions {
    readonly verbose?: boolean;
    readonly basePath?: string;
}

type CommandServices<TServices extends ServiceKeys> = ResolvedServices<ServiceKeysFromArray<TServices>>;

export class WorkflowOrchestrator {
    private readonly options: WorkflowOrchestratorOptions;

    constructor(options: WorkflowOrchestratorOptions = {}) {
        this.options = options;
    }

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

    private runAfterExecute<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>,
        result: WorkflowExecutionResult
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        if (!command.afterExecute) return okAsync(result);
        return command.afterExecute(result, context).map(() => result);
    }

    private handleCommandError<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>,
        error: FireflyError
    ): FireflyAsyncResult<WorkflowExecutionResult> {
        const wrappedError = createFireflyError({
            code: "FAILED",
            message: error.message,
            source: "execution/workflow-orchestrator",
            cause: error,
        });

        if (!command.onError) return errAsync(error);

        return command
            .onError(new Error(error.message), context)
            .andThen(() => errAsync(wrappedError))
            .orElse(() => errAsync(wrappedError));
    }

    private buildAndOrderTasks<TConfig, TData extends Record<string, unknown>, TServices extends ServiceKeys>(
        command: Command<TConfig, TData, TServices>,
        context: WorkflowContext<TConfig, TData, CommandServices<TServices>>
    ): FireflyAsyncResult<Task[]> {
        logger.verbose(`WorkflowOrchestrator: Building tasks for "${command.meta.name}"`);

        return command.buildTasks(context).andThen((tasks) => {
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
        });
    }
}
