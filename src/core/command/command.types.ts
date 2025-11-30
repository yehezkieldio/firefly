import type z from "zod";
import type { WorkflowContext, WorkflowData } from "#/core/context/workflow.context";
import type { WorkflowExecutionResult } from "#/core/execution/workflow.executor";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { ResolvedServices, ServiceKey, ServiceKeys, ServiceKeysFromArray } from "#/core/service/service.registry";
import type { Task } from "#/core/task/task.types";

// Branded type symbol for command type erasure
declare const CommandBrand: unique symbol;

/**
 * Branded command type for type-safe registry storage.
 */
export type BrandedCommand = {
    readonly [CommandBrand]: "Command";
    readonly meta: CommandMetadata;
    buildTasks: (context: WorkflowContext) => FireflyAsyncResult<Task[]>;
    beforeExecute?: (context: WorkflowContext) => FireflyAsyncResult<void>;
    afterExecute?: (result: WorkflowExecutionResult, context: WorkflowContext) => FireflyAsyncResult<void>;
    onError?: (error: Error, context: WorkflowContext) => FireflyAsyncResult<void>;
};

/**
 * Metadata describing a command's identity, schema, and requirements.
 * @template TServices - Tuple of service keys required by this command
 */
export interface CommandMetadata<TServices extends ServiceKeys = ServiceKeys> {
    /**
     * Unique command name (used for CLI invocation and registry lookup)
     */
    readonly name: string;
    /**
     * Human-readable description of what the command does
     */
    readonly description: string;
    /**
     * Zod schema for validating command configuration
     */
    readonly configSchema: z.ZodType;
    /**
     * Array of service keys this command requires
     */
    readonly requiredServices: TServices;
    /**
     * Optional usage examples for documentation
     */
    readonly examples?: readonly string[];
}

/**
 * Specialized workflow context type for command execution.
 *
 * Resolves the services type based on the command's required services,
 * ensuring type-safe service access within command lifecycle hooks.
 *
 * @template TConfig - Command configuration type
 * @template TData - Workflow data type
 * @template TServices - Tuple of required service keys
 */
export type CommandContext<TConfig, TData extends WorkflowData, TServices extends ServiceKeys> = WorkflowContext<
    TConfig,
    TData,
    ResolvedServices<ServiceKeysFromArray<TServices>>
>;

/**
 * A command represents a complete workflow operation.
 *
 * Commands provide:
 * - **Metadata**: Name, description, config schema, and service requirements
 * - **Task Building**: Dynamic task generation based on configuration
 * - **Lifecycle Hooks**: beforeExecute, afterExecute, and onError handlers
 *
 * @template TConfig - Type of the command's configuration
 * @template TData - Type of workflow data accumulated during execution
 * @template TServices - Tuple of service keys required by this command
 *
 * @example
 * ```typescript
 * const releaseCommand = createCommand({
 *   meta: {
 *     name: "release",
 *     description: "Creates a new release with changelog",
 *     configSchema: ReleaseConfigSchema,
 *     requiredServices: ["fs", "git"] as const,
 *   },
 *   buildTasks: (ctx) => {
 *     return okAsync([preflightTask, changelogTask, commitTask]);
 *   },
 *   beforeExecute: (ctx) => {
 *     logger.info(`Starting release ${ctx.config.version}`);
 *     return okAsync(undefined);
 *   },
 *   afterExecute: (result, ctx) => {
 *     if (result.success) {
 *       logger.info("Release complete!");
 *     }
 *     return okAsync(undefined);
 *   },
 * }) satisfies Command<ReleaseConfig, ReleaseData, readonly ["fs", "git"]>;
 * ```
 */
export interface Command<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    TServices extends ServiceKeys = readonly ServiceKey[],
> {
    /** Command metadata including name, description, and requirements */
    readonly meta: CommandMetadata<TServices>;

    /**
     * Dynamically builds the tasks for this command.
     * Called during command execution to generate the task list.
     * @param context - Workflow context with resolved services
     * @returns Array of tasks to execute
     */
    buildTasks: (context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<Task[]>;

    /**
     * Optional hook called before task execution begins.
     * Useful for validation, logging, or setup that must occur
     * before any tasks run.
     * @param context - Workflow context with resolved services
     */
    beforeExecute?: (context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<void>;

    /**
     * Optional hook called after all tasks complete (success or failure).
     * Receives the execution result for reporting or cleanup.
     * @param result - The workflow execution result
     * @param context - Workflow context with resolved services
     */
    afterExecute?: (
        result: WorkflowExecutionResult,
        context: CommandContext<TConfig, TData, TServices>
    ) => FireflyAsyncResult<void>;

    /**
     * Optional error handler called when execution fails.
     * Can perform cleanup or custom error reporting.
     * @param error - The error that caused the failure
     * @param context - Workflow context with resolved services
     */
    onError?: (error: Error, context: CommandContext<TConfig, TData, TServices>) => FireflyAsyncResult<void>;
}

/**
 * Erases a typed Command to a BrandedCommand for registry storage.
 *
 * @param command - The typed command to erase
 * @returns A branded command safe for heterogeneous storage
 * @internal
 */
export function eraseCommandType<TConfig, TData extends WorkflowData, TServices extends ServiceKeys>(
    command: Command<TConfig, TData, TServices>
): BrandedCommand {
    return command as unknown as BrandedCommand;
}

/**
 * Recovers a Command type from a BrandedCommand.
 * Use with caution - caller is responsible for type correctness.
 *
 * @template TConfig - Expected configuration type
 * @template TData - Expected data type
 * @template TServices - Expected services tuple
 * @param branded - The branded command to recover
 * @returns The command with restored type parameters
 * @internal
 */
export function recoverCommandType<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    TServices extends ServiceKeys = readonly ServiceKey[],
>(branded: BrandedCommand): Command<TConfig, TData, TServices> {
    return branded as unknown as Command<TConfig, TData, TServices>;
}
