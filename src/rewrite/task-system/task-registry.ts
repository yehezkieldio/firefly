import { err, ok } from "neverthrow";
import type { Task } from "#/rewrite/task-system/task-types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

/**
 * Task registry for dynamic task discovery and management.
 */
export class TaskRegistry {
    private readonly tasks = new Map<string, Task>();

    /**
     * Register a task in the registry.
     */
    register(task: Task): FireflyResult<void> {
        if (this.tasks.has(task.meta.id)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task with id "${task.meta.id}" is already registered`,
                    source: "rewrite/task-system/task-registry",
                }),
            );
        }

        // Validate dependencies exist
        for (const depId of task.meta.dependencies ?? []) {
            if (!this.tasks.has(depId)) {
                return err(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task "${task.meta.id}" depends on "${depId}" which is not registered`,
                        source: "rewrite/task-system/task-registry",
                    }),
                );
            }
        }

        this.tasks.set(task.meta.id, task);
        return ok();
    }

    /**
     * Register multiple tasks in order.
     */
    registerAll(tasks: Task[]): FireflyResult<void> {
        for (const task of tasks) {
            const result = this.register(task);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    /**
     * Get a task by ID.
     */
    get(taskId: string): FireflyResult<Task> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task with id "${taskId}" not found in registry`,
                    source: "rewrite/task-system/task-registry",
                }),
            );
        }
        return ok(task);
    }

    /**
     * Get all registered tasks.
     */
    getAll(): Task[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Check if a task exists.
     */
    has(taskId: string): boolean {
        return this.tasks.has(taskId);
    }

    /**
     * Get task count.
     */
    size(): number {
        return this.tasks.size;
    }

    /**
     * Clear all tasks.
     */
    clear(): void {
        this.tasks.clear();
    }

    /**
     * Build an ordered task list based on dependencies.
     * Returns tasks in topological order (dependencies before dependents).
     */
    buildExecutionOrder(): FireflyResult<Task[]> {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const ordered: Task[] = [];

        const visit = (taskId: string): FireflyResult<void> => {
            // Check for circular dependencies
            if (recursionStack.has(taskId)) {
                return err(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Circular dependency detected involving task "${taskId}"`,
                        source: "rewrite/task-system/task-registry",
                    }),
                );
            }

            // Already visited, skip
            if (visited.has(taskId)) {
                return ok();
            }

            const taskResult = this.get(taskId);
            if (taskResult.isErr()) {
                return err(taskResult.error);
            }

            const task = taskResult.value;
            recursionStack.add(taskId);

            // Visit dependencies first
            for (const depId of task.meta.dependencies ?? []) {
                const result = visit(depId);
                if (result.isErr()) {
                    return result;
                }
            }

            recursionStack.delete(taskId);
            visited.add(taskId);
            ordered.push(task);

            return ok();
        };

        // Visit all tasks
        for (const taskId of this.tasks.keys()) {
            const result = visit(taskId);
            if (result.isErr()) {
                return err(result.error);
            }
        }

        return ok(ordered);
    }
}
