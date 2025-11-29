import type { AnyCommand, Command } from "#/command-registry/command-types";
import { BaseRegistry } from "#/core/registry";
import type { FireflyResult } from "#/utils/result";

/**
 * Registry for managing workflow commands.
 *
 * Extends `BaseRegistry` with command-specific functionality:
 * - Type-safe command registration with generic support
 * - Command name uniqueness enforcement
 * - Retrieval of all registered command names
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
export class CommandRegistry extends BaseRegistry<AnyCommand> {
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
     * @param command - The command to register
     * @returns `Ok(void)` on success, `Err(FireflyError)` if command name already exists
     */
    registerCommand<TConfig, TData extends Record<string, unknown>>(
        command: Command<TConfig, TData>
    ): FireflyResult<void> {
        return this.register(command as AnyCommand);
    }

    /**
     * Registers multiple typed commands.
     *
     * @template TConfig - The commands' configuration type
     * @template TData - The commands' data type
     * @param commands - Array of commands to register
     * @returns `Ok(void)` if all registered, `Err(FireflyError)` on first failure
     */
    registerAllCommands<TConfig, TData extends Record<string, unknown>>(
        commands: Command<TConfig, TData>[]
    ): FireflyResult<void> {
        return this.registerAll(commands as AnyCommand[]);
    }

    /**
     * Returns all registered command names.
     * @returns Array of command names in registration order
     */
    getNames(): string[] {
        return this.getKeys();
    }
}
