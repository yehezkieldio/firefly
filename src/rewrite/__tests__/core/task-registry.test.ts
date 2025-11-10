import { describe, expect, it, beforeEach } from "bun:test";
import { TaskRegistry } from "#/rewrite/task-system/task-registry";
import { createMockTask } from "../helpers/test-helpers";

describe("TaskRegistry", () => {
    let registry: TaskRegistry<Record<string, unknown>>;

    beforeEach(() => {
        registry = new TaskRegistry();
    });

    describe("register", () => {
        it("should register a task successfully", () => {
            const task = createMockTask("task-1");
            const result = registry.register(task);

            expect(result.isOk()).toBe(true);
        });

        it("should return error for duplicate task ID", () => {
            const task1 = createMockTask("task-1");
            const task2 = createMockTask("task-1");

            registry.register(task1);
            const result = registry.register(task2);

            expect(result.isErr()).toBe(true);
        });
    });

    describe("get", () => {
        it("should retrieve registered task", () => {
            const task = createMockTask("task-1");
            registry.register(task);

            const result = registry.get("task-1");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.meta.id).toBe("task-1");
            }
        });

        it("should return error for unknown task", () => {
            const result = registry.get("unknown");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("resolveDependencies", () => {
        it("should resolve tasks with no dependencies", () => {
            const task1 = createMockTask("task-1");
            const task2 = createMockTask("task-2");

            registry.register(task1);
            registry.register(task2);

            const result = registry.resolveDependencies([task1, task2]);

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value).toHaveLength(2);
            }
        });

        it("should resolve tasks with dependencies in correct order", () => {
            const task1 = createMockTask("task-1");
            const task2 = {
                ...createMockTask("task-2"),
                meta: {
                    id: "task-2",
                    description: "Task 2",
                    dependencies: ["task-1"],
                },
            };

            registry.register(task1);
            registry.register(task2);

            const result = registry.resolveDependencies([task2, task1]);

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value[0].meta.id).toBe("task-1");
                expect(result.value[1].meta.id).toBe("task-2");
            }
        });

        it("should detect circular dependencies", () => {
            const task1 = {
                ...createMockTask("task-1"),
                meta: {
                    id: "task-1",
                    description: "Task 1",
                    dependencies: ["task-2"],
                },
            };
            const task2 = {
                ...createMockTask("task-2"),
                meta: {
                    id: "task-2",
                    description: "Task 2",
                    dependencies: ["task-1"],
                },
            };

            registry.register(task1);
            registry.register(task2);

            const result = registry.resolveDependencies([task1, task2]);

            expect(result.isErr()).toBe(true);
        });
    });

    describe("clear", () => {
        it("should remove all registered tasks", () => {
            const task1 = createMockTask("task-1");
            const task2 = createMockTask("task-2");

            registry.register(task1);
            registry.register(task2);
            registry.clear();

            expect(registry.get("task-1").isErr()).toBe(true);
            expect(registry.get("task-2").isErr()).toBe(true);
        });
    });
});
