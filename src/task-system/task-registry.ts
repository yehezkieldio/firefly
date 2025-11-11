import { err, ok } from "neverthrow";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";
import type { Task } from "./task-types";

export class TaskRegistry {
    private readonly tasks = new Map<string, Task>();

    register(task: Task): FireflyResult<void> {
        if (this.tasks.has(task.metadata.id)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task with id '${task.metadata.id}' is already registered.`,
                })
            );
        }

        // Verify dependencies exist
        for (const depId of task.metadata.dependencies ?? []) {
            if (!this.tasks.has(depId)) {
                return err(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task with id '${task.metadata.id}' has unknown dependency '${depId}'.`,
                    })
                );
            }
        }

        this.tasks.set(task.metadata.id, task);
        return ok();
    }

    registerAll(tasks: Task[]): FireflyResult<void> {
        for (const task of tasks) {
            const result = this.register(task);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    get(taskId: string): FireflyResult<Task> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Task with id '${taskId}' is not registered.`,
                })
            );
        }
        return ok(task);
    }

    getAll(): Task[] {
        return Array.from(this.tasks.values());
    }

    has(taskId: string): boolean {
        return this.tasks.has(taskId);
    }

    size(): number {
        return this.tasks.size;
    }

    clear(): void {
        this.tasks.clear();
    }

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
                    })
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
            for (const depId of task.metadata.dependencies ?? []) {
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
