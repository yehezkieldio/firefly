import { Result } from "neverthrow";
import { releaseSkipPredicates } from "#/commands/release/groups/skip-predicates";
import type { ReleaseContext } from "#/commands/release/release.context";
import { createDelegateBumpStrategyTask } from "#/commands/release/tasks/delegate-bump-strategy.task";
import { createDetermineAutomaticBump } from "#/commands/release/tasks/determine-automatic-bump.task";
import { createPromptBumpStrategyTask } from "#/commands/release/tasks/prompt-bump-strategy.task";
import { createPromptManualVersionTask } from "#/commands/release/tasks/prompt-manual-bump.task";
import { createStraightVersionBump } from "#/commands/release/tasks/straight-version-bump.task";
import type { FireflyResult } from "#/core/result/result.types";
import { buildTaskGroup } from "#/core/task/task-group.builder";
import type { TaskGroup } from "#/core/task/task-group.types";

/**
 * Creates the bump strategy group containing version bump decision tasks.
 *
 * This group handles determining the version bump strategy (auto/manual)
 * and the specific release type. It is skipped when skipBump is enabled.
 *
 */
export function createBumpStrategyGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [
        createStraightVersionBump(),
        createPromptBumpStrategyTask(),
        createDelegateBumpStrategyTask(),
        createDetermineAutomaticBump(),
        createPromptManualVersionTask(),
    ];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("bump-strategy")
        .description("Version bump strategy selection")
        .dependsOnGroup("setup")
        .skipWhen(releaseSkipPredicates.skipBump)
        .skipReason("Skipped: skipBump is enabled")
        .tasks(combined.value)
        .build();
}
