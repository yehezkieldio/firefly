import { FireflyOk, invalidErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import type { GenericWorkflowContext, Task } from "#/core/task/task.types";
import type {
    GroupSkipCondition,
    GroupSkipPredicate,
    TaskGroup,
    TaskGroupMeta,
    TaskGroupOptions,
} from "#/core/task/task-group.types";

/**
 * Fluent builder for constructing validated task groups.
 * Provides a chainable API for defining group properties.
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
            return invalidErr({
                message: `Task group "${this.groupId}" must have a description`,
                source: "TaskGroupBuilder.build",
            });
        }

        if (this.groupTasks.length === 0) {
            return invalidErr({
                message: `Task group "${this.groupId}" must have at least one task`,
                source: "TaskGroupBuilder.build",
            });
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

        return FireflyOk(group);
    }
}

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
