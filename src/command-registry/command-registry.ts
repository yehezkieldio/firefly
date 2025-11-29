import { err, ok } from "neverthrow";
import type { AnyCommand, Command } from "#/command-registry/command-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

export class CommandRegistry {
    private readonly commands = new Map<string, AnyCommand>();

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

    getAll(): AnyCommand[] {
        return Array.from(this.commands.values());
    }

    getNames(): string[] {
        return Array.from(this.commands.keys());
    }

    has(commandName: string): boolean {
        return this.commands.has(commandName);
    }

    size(): number {
        return this.commands.size;
    }

    clear(): void {
        this.commands.clear();
    }
}
