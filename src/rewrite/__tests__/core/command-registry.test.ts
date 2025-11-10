import { describe, expect, it, beforeEach } from "bun:test";
import { CommandRegistry } from "#/rewrite/command-registry/command-registry";
import { createCommand } from "#/rewrite/command-registry/command-types";
import { okAsync } from "neverthrow";
import { z } from "zod";

describe("CommandRegistry", () => {
    let registry: CommandRegistry;

    beforeEach(() => {
        registry = new CommandRegistry();
    });

    describe("register", () => {
        it("should register a command successfully", () => {
            const command = createCommand({
                meta: {
                    name: "test",
                    description: "Test command",
                    configSchema: z.object({}),
                },
                buildTasks: () => okAsync([]),
            });

            const result = registry.register(command);

            expect(result.isOk()).toBe(true);
        });

        it("should return error for duplicate command name", () => {
            const command1 = createCommand({
                meta: { name: "test", description: "Test 1", configSchema: z.object({}) },
                buildTasks: () => okAsync([]),
            });
            const command2 = createCommand({
                meta: { name: "test", description: "Test 2", configSchema: z.object({}) },
                buildTasks: () => okAsync([]),
            });

            registry.register(command1);
            const result = registry.register(command2);

            expect(result.isErr()).toBe(true);
        });
    });

    describe("get", () => {
        it("should retrieve registered command", () => {
            const command = createCommand({
                meta: { name: "test", description: "Test", configSchema: z.object({}) },
                buildTasks: () => okAsync([]),
            });

            registry.register(command);
            const result = registry.get("test");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.meta.name).toBe("test");
            }
        });

        it("should return error for unknown command", () => {
            const result = registry.get("unknown");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("listAll", () => {
        it("should return all registered commands", () => {
            const command1 = createCommand({
                meta: { name: "cmd1", description: "Command 1", configSchema: z.object({}) },
                buildTasks: () => okAsync([]),
            });
            const command2 = createCommand({
                meta: { name: "cmd2", description: "Command 2", configSchema: z.object({}) },
                buildTasks: () => okAsync([]),
            });

            registry.register(command1);
            registry.register(command2);

            const commands = registry.listAll();

            expect(commands).toHaveLength(2);
            expect(commands.map(c => c.meta.name)).toContain("cmd1");
            expect(commands.map(c => c.meta.name)).toContain("cmd2");
        });
    });
});
