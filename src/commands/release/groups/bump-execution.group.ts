import { releaseSkipPredicates } from "#/commands/release/groups/skip-predicates";
import type { ReleaseContext } from "#/commands/release/release.context";
import { createBumpReleaseVersion } from "#/commands/release/tasks/bump-release-version.task";
import type { FireflyResult } from "#/core/result/result.types";
import { buildTaskGroup } from "#/core/task/task-group.builder";
import type { TaskGroup } from "#/core/task/task-group.types";

/**
 * Creates the bump execution group containing the actual version bump task.
 *
 * This group executes the version bump in package.json after the strategy
 * has been determined. It is skipped when skipBump is enabled.
 */
export function createBumpExecutionGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResult = createBumpReleaseVersion();
    if (taskResult.isErr()) {
        return taskResult.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("bump-execution")
        .description("Version bump execution")
        .dependsOnGroup("bump-strategy")
        .skipWhen(releaseSkipPredicates.skipBump)
        .skipReason("Skipped: skipBump is enabled")
        .tasks([taskResult.value])
        .build();
}
