import { err, ok } from "neverthrow";
import type { Command } from "#/command-registry/command-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

export class CommandRegistry {
    private readonly commands = new Map<string, Command>();

    register(command: Command): FireflyResult<void> {
        const commandName = command.meta.name;

        if (this.commands.has(commandName)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Command with name "${commandName}" is already registered`,
                    source: "command-registry/command-registry",
                })
            );
        }

        this.commands.set(commandName, command);
        return ok();
    }

    registerAll(commands: Command[]): FireflyResult<void> {
        for (const command of commands) {
            const result = this.register(command);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    get(commandName: string): FireflyResult<Command> {
        const command = this.commands.get(commandName);
        if (!command) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Command "${commandName}" not found in registry`,
                    source: "command-registry/command-registry",
                })
            );
        }
        return ok(command);
    }

    getAll(): Command[] {
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
