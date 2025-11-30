import { err } from "neverthrow";
import { BaseRegistry } from "#/core/registry/base.registry";
import { FireflyOk, validationErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { topologicalSort } from "#/core/task/task.graph";
import type { Task } from "#/core/task/task.types";
import {
    createGroupRegistry,
    expandTaskGroup,
    type GroupRegistry,
    updateGroupRegistry,
} from "#/core/task/task-group.expansion";
import type { TaskGroup } from "#/core/task/task-group.types";

/**
 * Registry for managing workflow tasks with dependency validation.
 *
 * @example
 * ```typescript
 * const registry = new TaskRegistry();
 *
 * // Register tasks (dependencies must be registered first)
 * registry.register(taskA);
 * registry.register(taskB); // If taskB depends on taskA, taskA must exist
 *
 * // Or register a group of related tasks
 * registry.registerGroup(gitGroup);
 *
 * // Iterate directly in execution order using for-of
 * const orderResult = registry.buildExecutionOrder();
 * if (orderResult.isFireflyOk()) {
 *   for (const task of orderResult.value) {
 *     await task.execute(context);
 *   }
 * }
 *
 * // Or use spread operator
 * const tasks = [...registry];
 * ```
 */
export class TaskRegistry extends BaseRegistry<Task> {
    private readonly groupRegistry: GroupRegistry;

    constructor() {
        super({
            name: "Task",
            source: "TaskRegistry",
            getKey: (task) => task.meta.id,
            duplicateErrorCode: "VALIDATION",
            notFoundErrorCode: "VALIDATION",
        });
        this.groupRegistry = createGroupRegistry();
    }

    override get [Symbol.toStringTag](): string {
        return "TaskRegistry";
    }

    /**
     * Implements Symbol.iterator for direct iteration over tasks in execution order.
     * Uses a generator for lazy topological traversal.
     *
     * @yields Tasks in dependency-respecting execution order
     * @throws If circular dependency is detected
     *
     * @example
     * ```typescript
     * for (const task of registry) {
     *   console.log(task.meta.id);
     * }
     *
     * // Or spread into array
     * const tasks = [...registry];
     * ```
     */
    *[Symbol.iterator](): Generator<Task, void, undefined> {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const visit = function* (this: TaskRegistry, taskId: string): Generator<Task, void, undefined> {
            // Check for circular dependencies
            if (recursionStack.has(taskId)) {
                // biome-ignore lint: Generators can't use result types for error handling within the iterator itself
                throw new Error(`Circular dependency detected involving task "${taskId}"`);
            }

            // Already visited, skip
            if (visited.has(taskId)) {
                return;
            }

            const task = this.items.get(taskId);
            if (!task) return;

            recursionStack.add(taskId);

            // Visit dependencies first
            for (const depId of task.meta.dependencies ?? []) {
                yield* visit.call(this, depId);
            }

            recursionStack.delete(taskId);
            visited.add(taskId);
            yield task;
        };

        // Visit all tasks
        for (const taskId of this.items.keys()) {
            yield* visit.call(this, taskId);
        }
    }

    /**
     * Registers a task after validating its dependencies exist.
     *
     * @param task - The task to register
     * @returns `FireflyOk(void)` on success, `Err(FireflyError)` if duplicate or missing dependency
     * @override
     */
    override register(task: Task): FireflyResult<void> {
        // Check for duplicates first
        if (this.items.has(task.meta.id)) {
            return validationErr({
                message: `Task "${task.meta.id}" is already registered`,
            });
        }

        // Validate dependencies exist
        for (const depId of task.meta.dependencies ?? []) {
            if (!this.items.has(depId)) {
                return validationErr({
                    message: `Task "${task.meta.id}" depends on "${depId}" which is not registered`,
                });
            }
        }

        this.items.set(task.meta.id, task);
        return FireflyOk(undefined);
    }

    /**
     * Registers a task group, expanding it into individual tasks with namespaced IDs.
     *
     * This method:
     * 1. Expands the group into individual tasks with `groupId:taskId` format
     * 2. Merges group skip conditions with task-level skip conditions
     * 3. Resolves inter-group dependencies
     * 4. Registers all expanded tasks
     *
     * @param group - The task group to register
     * @returns `FireflyOk(void)` on success, `Err(FireflyError)` if validation fails
     *
     * @example
     * ```typescript
     * const gitGroup = buildTaskGroup("git")
     *   .description("Git operations")
     *   .skipWhen((ctx) => ctx.config.skipGit)
     *   .tasks([stageTask, commitTask, tagTask])
     *   .build();
     *
     * if (gitGroup.isFireflyOk()) {
     *   registry.registerGroup(gitGroup.value);
     * }
     * ```
     */
    registerGroup(group: TaskGroup): FireflyResult<void> {
        // Check for duplicate group ID
        if (this.groupRegistry.lastTaskByGroup.has(group.meta.id)) {
            return validationErr({
                message: `Task group "${group.meta.id}" is already registered`,
            });
        }

        // Expand the group into individual tasks
        const expandResult = expandTaskGroup(group, this.groupRegistry.lastTaskByGroup);
        if (expandResult.isErr()) {
            return err(expandResult.error);
        }

        // Register each expanded task
        for (const task of expandResult.value.tasks) {
            const registerResult = this.register(task);
            if (registerResult.isErr()) {
                return registerResult;
            }
        }

        // Update the group registry
        updateGroupRegistry(this.groupRegistry, expandResult.value);

        return FireflyOk(undefined);
    }

    /**
     * Registers multiple task groups in order.
     *
     * Groups are registered sequentially, allowing later groups to depend on earlier ones.
     *
     * @param groups - Array of task groups to register
     * @returns `FireflyOk(void)` on success, `Err(FireflyError)` if any registration fails
     */
    registerGroups(groups: TaskGroup[]): FireflyResult<void> {
        for (const group of groups) {
            const result = this.registerGroup(group);
            if (result.isErr()) {
                return result;
            }
        }
        return FireflyOk(undefined);
    }

    /**
     * Gets all task IDs belonging to a specific group.
     *
     * @param groupId - The group ID to query
     * @returns Array of namespaced task IDs, or empty array if group not found
     */
    getGroupTaskIds(groupId: string): string[] {
        return this.groupRegistry.tasksByGroup.get(groupId) ?? [];
    }

    /**
     * Gets all registered group IDs.
     *
     * @returns Array of group IDs in registration order
     */
    getGroupIds(): string[] {
        return [...this.groupRegistry.lastTaskByGroup.keys()];
    }

    /**
     * Checks if a group has been registered.
     *
     * @param groupId - The group ID to check
     * @returns True if the group is registered
     */
    hasGroup(groupId: string): boolean {
        return this.groupRegistry.lastTaskByGroup.has(groupId);
    }

    /**
     * Builds an execution order that respects task dependencies.
     * @returns `FireflyOk(Task[])` with tasks in execution order, `Err(FireflyError)` if circular dependency detected
     */
    buildExecutionOrder(): FireflyResult<Task[]> {
        const tasks = [...this.items.values()];
        const sortResult = topologicalSort(tasks);

        if (sortResult.isErr()) {
            return err(sortResult.error);
        }

        // Map sorted IDs back to Task objects
        const orderedTasks: Task[] = [];
        for (const taskId of sortResult.value) {
            const task = this.items.get(taskId);
            if (task) {
                orderedTasks.push(task);
            }
        }

        return FireflyOk(orderedTasks);
    }
}
