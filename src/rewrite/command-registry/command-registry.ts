import { err, ok } from "neverthrow";
import type { Command } from "#/rewrite/command-registry/command-types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

/**
 * Command registry for dynamic command discovery.
 * Commands register themselves independently.
 */
export class CommandRegistry {
    private readonly commands = new Map<string, Command>();

    /**
     * Register a command in the registry.
     */
    register(command: Command): FireflyResult<void> {
        const commandName = command.meta.name;

        if (this.commands.has(commandName)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Command with name "${commandName}" is already registered`,
                    source: "rewrite/command-registry/command-registry",
                }),
            );
        }

        this.commands.set(commandName, command);
        return ok();
    }

    /**
     * Register multiple commands.
     */
    registerAll(commands: Command[]): FireflyResult<void> {
        for (const command of commands) {
            const result = this.register(command);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    /**
     * Get a command by name.
     */
    get(commandName: string): FireflyResult<Command> {
        const command = this.commands.get(commandName);
        if (!command) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Command "${commandName}" not found in registry`,
                    source: "rewrite/command-registry/command-registry",
                }),
            );
        }
        return ok(command);
    }

    /**
     * Get all registered commands.
     */
    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get all command names.
     */
    getNames(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * Check if a command exists.
     */
    has(commandName: string): boolean {
        return this.commands.has(commandName);
    }

    /**
     * Get command count.
     */
    size(): number {
        return this.commands.size;
    }

    /**
     * Clear all commands.
     */
    clear(): void {
        this.commands.clear();
    }
}
