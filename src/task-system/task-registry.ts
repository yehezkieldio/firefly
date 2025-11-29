import { err, ok } from "neverthrow";
import { BaseRegistry } from "#/core/registry";
import type { Task } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

/**
 * Registry for managing workflow tasks with dependency validation.
 *
 * Extends `BaseRegistry` with task-specific functionality:
 * - Validates that task dependencies exist at registration time
 * - Provides topological sorting for execution order
 * - Detects circular dependencies
 *
 * @example
 * ```typescript
 * const registry = new TaskRegistry();
 *
 * // Register tasks (dependencies must be registered first)
 * registry.register(taskA);
 * registry.register(taskB); // If taskB depends on taskA, taskA must exist
 *
 * // Get execution order respecting dependencies
 * const orderResult = registry.buildExecutionOrder();
 * if (orderResult.isOk()) {
 *   for (const task of orderResult.value) {
 *     await task.execute(context);
 *   }
 * }
 * ```
 */
export class TaskRegistry extends BaseRegistry<Task> {
    constructor() {
        super({
            name: "Task",
            source: "TaskRegistry",
            getKey: (task) => task.meta.id,
            duplicateErrorCode: "VALIDATION",
            notFoundErrorCode: "VALIDATION",
        });
    }

    /**
     * Registers a task after validating its dependencies exist.
     *
     * @param task - The task to register
     * @returns `Ok(void)` on success, `Err(FireflyError)` if duplicate or missing dependency
     * @override
     */
    override register(task: Task): FireflyResult<void> {
        // Check for duplicates first
        if (this.items.has(task.meta.id)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Task "${task.meta.id}" is already registered`,
                    source: "TaskRegistry.register",
                })
            );
        }

        // Validate dependencies exist
        for (const depId of task.meta.dependencies ?? []) {
            if (!this.items.has(depId)) {
                return err(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Task "${task.meta.id}" depends on "${depId}" which is not registered`,
                        source: "TaskRegistry.register",
                    })
                );
            }
        }

        this.items.set(task.meta.id, task);
        return ok();
    }

    /**
     * Builds an execution order that respects task dependencies.
     *
     * Uses topological sorting to ensure dependencies execute before their dependents.
     * Detects and reports circular dependencies.
     *
     * @returns `Ok(Task[])` with tasks in execution order, `Err(FireflyError)` if circular dependency detected
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
                        source: "TaskRegistry.buildExecutionOrder",
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
        for (const taskId of this.items.keys()) {
            const result = visit(taskId);
            if (result.isErr()) {
                return err(result.error);
            }
        }

        return ok(ordered);
    }
}
