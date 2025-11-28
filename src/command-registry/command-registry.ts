import { err, ok } from "neverthrow";
import type { AnyCommand, Command } from "#/command-registry/command-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

/**
 * Registry for storing and retrieving commands.
 * Uses type erasure internally to allow storing heterogeneous command types.
 */
export class CommandRegistry {
    private readonly commands = new Map<string, AnyCommand>();

    /**
     * Registers a command with the registry.
     * Accepts any typed command and stores it using type erasure.
     */
    register<TConfig, TData extends Record<string, unknown>>(command: Command<TConfig, TData>): FireflyResult<void> {
        const commandName = command.meta.name;

        if (this.commands.has(commandName)) {
            return err(
                createFireflyError({
                    code: "CONFLICT",
                    message: `Command with name "${commandName}" is already registered`,
                    source: "command-registry/command-registry",
                })
            );
        }

        this.commands.set(commandName, command as AnyCommand);
        return ok();
    }

    /**
     * Registers multiple commands at once.
     */
    registerAll<TConfig, TData extends Record<string, unknown>>(
        commands: Command<TConfig, TData>[]
    ): FireflyResult<void> {
        for (const command of commands) {
            const result = this.register(command);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    /**
     * Retrieves a command by name.
     * Returns the type-erased command which should be used with the orchestrator.
     */
    get(commandName: string): FireflyResult<AnyCommand> {
        const command = this.commands.get(commandName);

        if (!command) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Command "${commandName}" not found in registry`,
                    source: "command-registry/command-registry",
                })
            );
        }

        return ok(command);
    }

    /**
     * Returns all registered commands.
     */
    getAll(): AnyCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Returns names of all registered commands.
     */
    getNames(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * Checks if a command is registered.
     */
    has(commandName: string): boolean {
        return this.commands.has(commandName);
    }

    /**
     * Returns the number of registered commands.
     */
    size(): number {
        return this.commands.size;
    }

    /**
     * Clears all registered commands.
     */
    clear(): void {
        this.commands.clear();
    }
}
