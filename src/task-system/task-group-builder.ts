/**
 * Task Group Builder Module
 *
 * Provides a fluent builder API for constructing task groups with validation.
 * Ensures groups have required properties and properly configured tasks
 * before they can be used in a workflow.
 *
 * @module task-system/task-group-builder
 */

import { err, ok } from "neverthrow";
import type {
    ExpandedGroupResult,
    ExpandedTask,
    GroupSkipCondition,
    GroupSkipPredicate,
    TaskGroup,
    TaskGroupMeta,
    TaskGroupOptions,
} from "#/task-system/task-group";
import { createNamespacedTaskId } from "#/task-system/task-group";
import type { GenericWorkflowContext, Task } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

// ============================================================================
// Task Group Builder
// ============================================================================

/**
 * Fluent builder for constructing validated task groups.
 *
 * Provides a chainable API for defining group properties, with compile-time
 * and runtime validation to ensure groups are properly configured.
 *
 * @template TContext - The workflow context type for tasks in this group
 *
 * @example
 * ```typescript
 * const gitGroupResult = TaskGroupBuilder.create<ReleaseContext>("git")
 *   .description("Git operations for release")
 *   .dependsOnGroup("changelog")
 *   .skipWhen((ctx) => ctx.config.skipGit)
 *   .skipReason("Git operations disabled")
 *   .tasks([stageTask, commitTask, tagTask])
 *   .build();
 *
 * if (gitGroupResult.isErr()) {
 *   console.error("Invalid group:", gitGroupResult.error.message);
 * }
 * ```
 */
export class TaskGroupBuilder<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    private readonly groupId: string;
    private groupDescription?: string;
    private readonly groupDependencies: string[] = [];
    private skipConditionFn?: GroupSkipCondition<TContext>;
    private skipPredicateFn?: GroupSkipPredicate<TContext>;
    private skipReasonText?: string;
    private groupTasks: Task[] = [];

    private constructor(id: string) {
        this.groupId = id;
    }

    /**
     * Creates a new TaskGroupBuilder instance.
     * @template TCtx - The workflow context type
     * @param id - Unique identifier for the group
     */
    static create<TCtx extends GenericWorkflowContext = GenericWorkflowContext>(id: string): TaskGroupBuilder<TCtx> {
        return new TaskGroupBuilder<TCtx>(id);
    }

    /**
     * Sets the group's human-readable description.
     * Required - build() will fail without a description.
     * @param desc - Description of what the group does
     */
    description(desc: string): TaskGroupBuilder<TContext> {
        this.groupDescription = desc;
        return this;
    }

    /**
     * Adds a dependency on another group.
     * The dependency group must be registered before this group.
     * @param groupId - ID of the group this depends on
     */
    dependsOnGroup(groupId: string): TaskGroupBuilder<TContext> {
        this.groupDependencies.push(groupId);
        return this;
    }

    /**
     * Adds dependencies on multiple groups.
     * @param groupIds - IDs of groups this depends on
     */
    dependsOnGroups(...groupIds: string[]): TaskGroupBuilder<TContext> {
        this.groupDependencies.push(...groupIds);
        return this;
    }

    /**
     * Sets a simple skip condition based on a boolean predicate.
     * When true, all tasks in the group are skipped.
     * @param predicate - Function returning true if group should be skipped
     */
    skipWhen(predicate: GroupSkipPredicate<TContext>): TaskGroupBuilder<TContext> {
        this.skipPredicateFn = predicate;
        return this;
    }

    /**
     * Sets the reason shown in logs when the group is skipped.
     * @param reason - Human-readable reason
     */
    skipReason(reason: string): TaskGroupBuilder<TContext> {
        this.skipReasonText = reason;
        return this;
    }

    /**
     * Sets a custom skip condition with full control over the result.
     * @param fn - Function returning a SkipCondition result
     */
    shouldSkip(fn: GroupSkipCondition<TContext>): TaskGroupBuilder<TContext> {
        this.skipConditionFn = fn;
        return this;
    }

    /**
     * Sets the tasks belonging to this group.
     * @param tasks - Array of tasks to include in the group
     */
    tasks(tasks: Task[]): TaskGroupBuilder<TContext> {
        this.groupTasks = tasks;
        return this;
    }

    /**
     * Adds a single task to the group.
     * @param task - Task to add
     */
    addTask(task: Task): TaskGroupBuilder<TContext> {
        this.groupTasks.push(task);
        return this;
    }

    /**
     * Adds a task result to the group.
     * If the result is an error, the error is stored and will cause build() to fail.
     * @param taskResult - Result containing a task or error
     */
    addTaskResult(taskResult: FireflyResult<Task>): TaskGroupBuilder<TContext> {
        if (taskResult.isOk()) {
            this.groupTasks.push(taskResult.value);
        }
        return this;
    }

    /**
     * Builds the task group, validating that required properties are set.
     * @returns `Ok(TaskGroup)` if valid, `Err(FireflyError)` if missing required properties
     */
    build(): FireflyResult<TaskGroup<TContext>> {
        if (!this.groupDescription) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task group "${this.groupId}" must have a description`,
                    source: "TaskGroupBuilder.build",
                })
            );
        }

        if (this.groupTasks.length === 0) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Task group "${this.groupId}" must have at least one task`,
                    source: "TaskGroupBuilder.build",
                })
            );
        }

        const meta: TaskGroupMeta = {
            id: this.groupId,
            description: this.groupDescription,
            dependsOnGroups: this.groupDependencies.length > 0 ? [...this.groupDependencies] : undefined,
        };

        const options: TaskGroupOptions<TContext> = {};
        if (this.skipConditionFn) {
            (options as { skipCondition?: GroupSkipCondition<TContext> }).skipCondition = this.skipConditionFn;
        }
        if (this.skipPredicateFn) {
            (options as { skipWhen?: GroupSkipPredicate<TContext> }).skipWhen = this.skipPredicateFn;
        }
        if (this.skipReasonText) {
            (options as { skipReason?: string }).skipReason = this.skipReasonText;
        }

        const group: TaskGroup<TContext> = {
            meta,
            options: Object.keys(options).length > 0 ? options : undefined,
            tasks: [...this.groupTasks],
        };

        return ok(group);
    }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Convenience function to create a new TaskGroupBuilder.
 * Equivalent to `TaskGroupBuilder.create(id)`.
 *
 * @template TContext - The workflow context type
 * @param id - Unique identifier for the group
 *
 * @example
 * ```typescript
 * const group = buildTaskGroup<MyContext>("my-group")
 *   .description("Does something")
 *   .tasks([task1, task2])
 *   .build();
 * ```
 */
export function buildTaskGroup<TContext extends GenericWorkflowContext = GenericWorkflowContext>(
    id: string
): TaskGroupBuilder<TContext> {
    return TaskGroupBuilder.create<TContext>(id);
}

// ============================================================================
// Group Expansion
// ============================================================================

/**
 * Expands a task group into individual tasks with namespaced IDs.
 *
 * This function:
 * 1. Prefixes each task ID with the group ID (e.g., "group:task")
 * 2. Updates task dependencies to use namespaced IDs
 * 3. Merges group skip condition with each task's skip condition
 * 4. Adds inter-group dependencies to the first task in the group
 *
 * @param group - The task group to expand
 * @param registeredGroups - Map of already registered group IDs to their last task IDs
 * @returns Expanded tasks with namespaced IDs and merged skip conditions
 *
 * @example
 * ```typescript
 * const result = expandTaskGroup(gitGroup, new Map([["changelog", "changelog:generate"]]));
 * if (result.isOk()) {
 *   for (const task of result.value.tasks) {
 *     registry.register(task);
 *   }
 * }
 * ```
 */
export function expandTaskGroup(
    group: TaskGroup,
    registeredGroups: ReadonlyMap<string, string>
): FireflyResult<ExpandedGroupResult> {
    const groupId = group.meta.id;
    const groupSkipCondition = buildGroupSkipCondition(group);
    const expansionContext: TaskExpansionContext = {
        groupId,
        groupSkipCondition,
        taskIdMapping: new Map(),
        registeredGroups,
        dependsOnGroups: group.meta.dependsOnGroups,
    };

    const expandedTasksResult = expandTasks(group.tasks, expansionContext);
    if (expandedTasksResult.isErr()) {
        return err(expandedTasksResult.error);
    }

    return ok({
        groupId,
        tasks: expandedTasksResult.value,
        taskIdMapping: expansionContext.taskIdMapping,
    });
}

interface TaskExpansionContext {
    readonly groupId: string;
    readonly groupSkipCondition: GroupSkipCondition | undefined;
    readonly taskIdMapping: Map<string, string>;
    readonly registeredGroups: ReadonlyMap<string, string>;
    readonly dependsOnGroups: readonly string[] | undefined;
}

function expandTasks(tasks: readonly Task[], ctx: TaskExpansionContext): FireflyResult<ExpandedTask[]> {
    const expandedTasks: ExpandedTask[] = [];

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task) continue;

        const result = expandSingleTask(task, i, ctx);
        if (result.isErr()) {
            return err(result.error);
        }
        expandedTasks.push(result.value);
    }

    return ok(expandedTasks);
}

function expandSingleTask(task: Task, index: number, ctx: TaskExpansionContext): FireflyResult<ExpandedTask> {
    const { groupId, groupSkipCondition, taskIdMapping, registeredGroups, dependsOnGroups } = ctx;
    const originalTaskId = task.meta.id;
    const namespacedId = createNamespacedTaskId(groupId, originalTaskId);

    taskIdMapping.set(originalTaskId, namespacedId);

    const remappedDependencies = remapDependencies(task.meta.dependencies ?? [], taskIdMapping, groupId);

    // Add inter-group dependencies to the first task
    if (index === 0 && dependsOnGroups) {
        const interGroupResult = addInterGroupDependencies(dependsOnGroups, registeredGroups, groupId);
        if (interGroupResult.isErr()) {
            return err(interGroupResult.error);
        }
        remappedDependencies.push(...interGroupResult.value);
    }

    return ok(
        createExpandedTask({
            originalTask: task,
            namespacedId,
            originalTaskId,
            groupId,
            dependencies: remappedDependencies,
            groupSkipCondition,
        })
    );
}

function addInterGroupDependencies(
    dependsOnGroups: readonly string[],
    registeredGroups: ReadonlyMap<string, string>,
    groupId: string
): FireflyResult<string[]> {
    const deps: string[] = [];
    for (const depGroupId of dependsOnGroups) {
        const lastTaskOfDepGroup = registeredGroups.get(depGroupId);
        if (!lastTaskOfDepGroup) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Group "${groupId}" depends on group "${depGroupId}" which is not registered`,
                    source: "expandTaskGroup",
                })
            );
        }
        deps.push(lastTaskOfDepGroup);
    }
    return ok(deps);
}

/**
 * Builds a unified skip condition from group options.
 */
function buildGroupSkipCondition(group: TaskGroup): GroupSkipCondition | undefined {
    const { options } = group;
    if (!options) {
        return;
    }

    const { skipCondition, skipWhen, skipReason } = options;

    // If a full skip condition is provided, use it directly
    if (skipCondition) {
        return skipCondition;
    }

    // Convert simple predicate to full skip condition
    if (skipWhen) {
        return (ctx) =>
            ok({
                shouldSkip: skipWhen(ctx),
                reason: skipReason ?? `Group "${group.meta.id}" skip condition met`,
            });
    }

    return;
}

/**
 * Remaps task dependencies to use namespaced IDs.
 * Dependencies within the same group are namespaced.
 * Dependencies on external tasks are left unchanged.
 */
function remapDependencies(
    originalDeps: readonly string[],
    taskIdMapping: ReadonlyMap<string, string>,
    groupId: string
): string[] {
    return originalDeps.map((dep) => {
        // Check if this dependency is within the same group
        const namespacedDep = taskIdMapping.get(dep);
        if (namespacedDep) {
            return namespacedDep;
        }

        // Check if the dependency is already namespaced (cross-group reference)
        if (dep.includes(":")) {
            return dep;
        }

        // Assume it's a dependency on a task in the same group that hasn't been processed yet
        return createNamespacedTaskId(groupId, dep);
    });
}

interface CreateExpandedTaskOptions {
    readonly originalTask: Task;
    readonly namespacedId: string;
    readonly originalTaskId: string;
    readonly groupId: string;
    readonly dependencies: string[];
    readonly groupSkipCondition?: GroupSkipCondition;
}

/**
 * Creates an expanded task with merged skip condition.
 */
function createExpandedTask(opts: CreateExpandedTaskOptions): ExpandedTask {
    const { originalTask, namespacedId, originalTaskId, groupId, dependencies, groupSkipCondition } = opts;
    const mergedSkipCondition = mergeSkipConditions(originalTask.shouldSkip, groupSkipCondition);

    return {
        meta: {
            ...originalTask.meta,
            id: namespacedId,
            dependencies: dependencies.length > 0 ? dependencies : undefined,
        },
        shouldSkip: mergedSkipCondition,
        execute: originalTask.execute,
        undo: originalTask.undo,
        originalTaskId,
        groupId,
        groupSkipCondition,
    };
}

/**
 * Merges a group skip condition with a task's own skip condition.
 * The group condition is evaluated first - if it returns shouldSkip: true,
 * the task is skipped without evaluating its own condition.
 */
function mergeSkipConditions(
    taskSkipCondition: Task["shouldSkip"],
    groupSkipCondition?: GroupSkipCondition
): Task["shouldSkip"] {
    // No group condition, return task condition as-is
    if (!groupSkipCondition) {
        return taskSkipCondition;
    }

    // No task condition, return group condition
    if (!taskSkipCondition) {
        return groupSkipCondition;
    }

    // Merge both conditions: group skip takes precedence
    return (ctx) => {
        const groupResult = groupSkipCondition(ctx);
        if (groupResult.isErr()) {
            return groupResult;
        }

        // If group says skip, skip immediately
        if (groupResult.value.shouldSkip) {
            return groupResult;
        }

        // Otherwise, evaluate task's own condition
        return taskSkipCondition(ctx);
    };
}

/**
 * Tracks registered groups and their task mappings.
 */
export interface GroupRegistry {
    /** Map of group IDs to their last task's namespaced ID */
    readonly lastTaskByGroup: Map<string, string>;
    /** Map of group IDs to all their task IDs (namespaced) */
    readonly tasksByGroup: Map<string, string[]>;
}

/**
 * Creates an empty group registry for tracking registered groups.
 */
export function createGroupRegistry(): GroupRegistry {
    return {
        lastTaskByGroup: new Map(),
        tasksByGroup: new Map(),
    };
}

/**
 * Updates the group registry with a newly expanded group.
 */
export function updateGroupRegistry(registry: GroupRegistry, expandedResult: ExpandedGroupResult): void {
    const { groupId, tasks } = expandedResult;

    if (tasks.length === 0) {
        return;
    }

    // Record all task IDs for this group
    const taskIds = tasks.map((t) => t.meta.id);
    registry.tasksByGroup.set(groupId, taskIds);

    // Record the last task ID for inter-group dependencies
    const lastTask = tasks.at(-1);
    if (lastTask) {
        registry.lastTaskByGroup.set(groupId, lastTask.meta.id);
    }
}
