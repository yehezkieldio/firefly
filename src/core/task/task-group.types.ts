import type { FireflyResult } from "#/core/result/result.types";
import type { GenericWorkflowContext, SkipCondition, Task } from "#/core/task/task.types";

/**
 * A function that evaluates whether an entire group should be skipped.
 * When a group is skipped, all tasks within it are also skipped.
 */
export type GroupSkipCondition<TContext extends GenericWorkflowContext = GenericWorkflowContext> = (
    ctx: TContext
) => FireflyResult<SkipCondition>;

/**
 * A simple predicate for determining if a group should be skipped.
 */
export type GroupSkipPredicate<TContext extends GenericWorkflowContext = GenericWorkflowContext> = (
    ctx: TContext
) => boolean;

/**
 * Metadata describing a task group's identity and relationships.
 */
export interface TaskGroupMeta {
    /**
     * Unique identifier for the group within a workflow
     */
    readonly id: string;

    /**
     * Human-readable description of what the group does
     */
    readonly description: string;

    /**
     * IDs of other groups that must complete before this group can execute.
     * Group dependencies are resolved before task-level dependencies.
     */
    readonly dependsOnGroups?: readonly string[];
}

/**
 * Configuration options for task group behavior.
 */
export interface TaskGroupOptions<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /**
     * Skip condition evaluated at the group level.
     * When this returns shouldSkip: true, all tasks in the group are skipped.
     */
    readonly skipCondition?: GroupSkipCondition<TContext>;

    /**
     * Simple predicate for skipping the group.
     * Alternative to skipCondition when you only need a boolean check.
     */
    readonly skipWhen?: GroupSkipPredicate<TContext>;

    /**
     * Reason shown in logs when the group is skipped.
     */
    readonly skipReason?: string;
}

/**
 * A task group is a logical container for related tasks.
 *
 * @template TContext - The workflow context type for tasks in this group
 *
 * @example
 * ```typescript
 * const gitGroup = {
 *   meta: {
 *     id: "git",
 *     description: "Git operations for release",
 *     dependsOnGroups: ["bump", "changelog"],
 *   },
 *   options: {
 *     skipWhen: (ctx) => ctx.config.skipGit,
 *     skipReason: "Git operations disabled",
 *   },
 *   tasks: [stageChangesTask, commitTask, createTagTask],
 * } satisfies TaskGroup;
 * ```
 */
export interface TaskGroup<TContext extends GenericWorkflowContext = GenericWorkflowContext> {
    /** Group metadata including ID, description, and group dependencies */
    readonly meta: TaskGroupMeta;

    /** Optional configuration for group behavior */
    readonly options?: TaskGroupOptions<TContext>;

    /** Tasks belonging to this group (in declaration order) */
    readonly tasks: readonly Task[];
}

/**
 * Separator used between group ID and task ID.
 */
export const GROUP_TASK_SEPARATOR = ":" as const;

/**
 * Creates a namespaced task ID from a group ID and task ID.
 *
 * @param groupId - The group's unique identifier
 * @param taskId - The task's unique identifier within the group
 * @returns Namespaced ID in format `groupId:taskId`
 *
 * @example
 * ```typescript
 * const id = createNamespacedTaskId("git", "commit");
 * // Returns "git:commit"
 * ```
 */
export function createNamespacedTaskId(groupId: string, taskId: string): string {
    return `${groupId}${GROUP_TASK_SEPARATOR}${taskId}`;
}

/**
 * Parses a namespaced task ID into its components.
 *
 * @param namespacedId - The full namespaced ID
 * @returns Object with groupId and taskId, or null if not namespaced
 *
 * @example
 * ```typescript
 * const result = parseNamespacedTaskId("git:commit");
 * // Returns { groupId: "git", taskId: "commit" }
 *
 * const plain = parseNamespacedTaskId("plain-task");
 * // Returns null
 * ```
 */
export function parseNamespacedTaskId(namespacedId: string): { groupId: string; taskId: string } | null {
    const separatorIndex = namespacedId.indexOf(GROUP_TASK_SEPARATOR);
    if (separatorIndex === -1) {
        return null;
    }
    return {
        groupId: namespacedId.slice(0, separatorIndex),
        taskId: namespacedId.slice(separatorIndex + 1),
    };
}

/**
 * Checks if a task ID is namespaced (belongs to a group).
 *
 * @param taskId - The task ID to check
 * @returns True if the ID contains a group namespace
 */
export function isNamespacedTaskId(taskId: string): boolean {
    return taskId.includes(GROUP_TASK_SEPARATOR);
}

/**
 * Extracts the group ID from a namespaced task ID.
 *
 * @param namespacedId - The full namespaced ID
 * @returns The group ID, or null if not namespaced
 */
export function getGroupIdFromTaskId(namespacedId: string): string | null {
    const parsed = parseNamespacedTaskId(namespacedId);
    return parsed?.groupId ?? null;
}

/**
 * A task that has been expanded from a group, with group context attached.
 * Extends the base Task interface with group-related metadata.
 */
export interface ExpandedTask extends Task {
    /**
     * The original task ID before namespacing
     */
    readonly originalTaskId: string;

    /**
     * The group this task belongs to
     */
    readonly groupId: string;

    /**
     * The group's skip condition (merged with task's own condition)
     */
    readonly groupSkipCondition?: GroupSkipCondition;
}

/**
 * Result of expanding a task group into individual tasks.
 */
export interface ExpandedGroupResult {
    /**
     * The group ID
     */
    readonly groupId: string;

    /**
     * The expanded tasks with namespaced IDs
     */
    readonly tasks: readonly ExpandedTask[];

    /**
     * Mapping from original task IDs to namespaced IDs
     */
    readonly taskIdMapping: ReadonlyMap<string, string>;
}
