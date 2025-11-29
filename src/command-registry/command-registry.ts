import { type BrandedCommand, type Command, eraseCommandType } from "#/command-registry/command-types";
import { BaseRegistry } from "#/core/registry";
import type { ServiceKeys } from "#/services/service-registry";
import type { FireflyResult } from "#/utils/result";

/** Base constraint for workflow data */
type WorkflowData = Record<string, unknown>;

/**
 * Registry for managing workflow commands.
 *
 * Extends `BaseRegistry` with command-specific functionality:
 * - Type-safe command registration with generic support
 * - Command name uniqueness enforcement
 * - Retrieval of all registered command names
 * - Uses branded types instead of `any` for type erasure
 *
 * @example
 * ```typescript
 * const registry = new CommandRegistry();
 *
 * // Register a command
 * registry.register(releaseCommand);
 *
 * // Retrieve and execute
 * const cmdResult = registry.get("release");
 * if (cmdResult.isOk()) {
 *   await orchestrator.executeCommand(cmdResult.value, config);
 * }
 * ```
 */
export class CommandRegistry extends BaseRegistry<BrandedCommand> {
    constructor() {
        super({
            name: "Command",
            source: "CommandRegistry",
            getKey: (command) => command.meta.name,
            duplicateErrorCode: "CONFLICT",
            notFoundErrorCode: "NOT_FOUND",
        });
    }

    /**
     * Registers a typed command in the registry.
     *
     * @template TConfig - The command's configuration type
     * @template TData - The command's data type
     * @template TServices - The command's required services
     * @param command - The command to register
     * @returns `Ok(void)` on success, `Err(FireflyError)` if command name already exists
     */
    registerCommand<TConfig, TData extends WorkflowData = WorkflowData, TServices extends ServiceKeys = ServiceKeys>(
        command: Command<TConfig, TData, TServices>
    ): FireflyResult<void> {
        return this.register(eraseCommandType(command));
    }

    /**
     * Registers multiple typed commands.
     *
     * @template TConfig - The commands' configuration type
     * @template TData - The commands' data type
     * @template TServices - The commands' required services
     * @param commands - Array of commands to register
     * @returns `Ok(void)` if all registered, `Err(FireflyError)` on first failure
     */
    registerAllCommands<
        TConfig,
        TData extends WorkflowData = WorkflowData,
        TServices extends ServiceKeys = ServiceKeys,
    >(commands: readonly Command<TConfig, TData, TServices>[]): FireflyResult<void> {
        return this.registerAll(commands.map(eraseCommandType));
    }

    /**
     * Returns all registered command names.
     * @returns Array of command names in registration order
     */
    getNames(): string[] {
        return this.getKeys();
    }
}
