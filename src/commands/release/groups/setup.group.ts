import { Result } from "neverthrow";
import { createBumpExecutionGroup } from "#/commands/release/groups/bump-execution.group";
import { createBumpStrategyGroup } from "#/commands/release/groups/bump-strategy.group";
import type { ReleaseContext } from "#/commands/release/release.context";
import { createInitializeReleaseVersion } from "#/commands/release/tasks/initialize-release-version.task";
import { createPrepareReleaseConfigTask } from "#/commands/release/tasks/prepare-release-config.task";
import { createReleasePreflightTask } from "#/commands/release/tasks/release-preflight.task";
import type { FireflyResult } from "#/core/result/result.types";
import { buildTaskGroup } from "#/core/task/task-group.builder";
import type { TaskGroup } from "#/core/task/task-group.types";

/**
 * Creates the setup group containing preflight, config preparation, and version initialization.
 *
 * This group runs first and has no skip condition at the group level.
 * Individual tasks have their own skip conditions (preflight can be skipped via config).
 */
function createReleaseSetupGroup(skipPreflight: boolean): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [
        createReleasePreflightTask(() => skipPreflight),
        createPrepareReleaseConfigTask(),
        createInitializeReleaseVersion(),
    ];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("setup")
        .description("Setup and initialization tasks")
        .tasks(combined.value)
        .build();
}

/**
 * Creates all release task groups in the correct order.
 *
 * @param skipPreflight - Whether to skip the preflight check
 * @returns Array of task groups or an error
 */
export function createReleaseGroups(skipPreflight: boolean): FireflyResult<TaskGroup<ReleaseContext>[]> {
    const groupResults = [
        createReleaseSetupGroup(skipPreflight),
        createBumpStrategyGroup(),
        createBumpExecutionGroup(),
    ];

    return Result.combine(groupResults);
}
