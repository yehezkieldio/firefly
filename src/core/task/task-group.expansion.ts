import { validationError } from "#/core/result/error.factories";
import { FireflyErr, FireflyOk } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import type { Task } from "#/core/task/task.types";
import {
    createNamespacedTaskId,
    type ExpandedGroupResult,
    type ExpandedTask,
    type GroupSkipCondition,
    type TaskGroup,
} from "#/core/task/task-group.types";

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
        return FireflyErr(expandedTasksResult.error);
    }

    return FireflyOk({
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
            return FireflyErr(result.error);
        }
        expandedTasks.push(result.value);
    }

    return FireflyOk(expandedTasks);
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
            return FireflyErr(interGroupResult.error);
        }
        remappedDependencies.push(...interGroupResult.value);
    }

    return FireflyOk(
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
            return FireflyErr(
                validationError({
                    message: `Group "${groupId}" depends on group "${depGroupId}" which is not registered`,
                    source: "expandTaskGroup",
                })
            );
        }
        deps.push(lastTaskOfDepGroup);
    }
    return FireflyOk(deps);
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
            FireflyOk({
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
    /**
     * Map of group IDs to their last task's namespaced ID
     */
    readonly lastTaskByGroup: Map<string, string>;

    /**
     * Map of group IDs to all their task IDs (namespaced)
     */
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
