import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOk, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";

/**
 * Determines if the execute-bump-strategy task should be skipped.
 *
 * The task should execute when:
 * - No explicit releaseType is set (need to determine version bump)
 * - A bumpStrategy is configured (auto or manual)
 * - skipBump is not enabled
 */
function shouldSkipBumpStrategy(ctx: ReleaseContext): boolean {
    const { skipBump, releaseType, bumpStrategy } = ctx.config;
    const { selectedReleaseType, selectedBumpStrategy } = ctx.data;

    // Skip if bump is disabled from config
    if (skipBump) return true;

    // Skip if explicit releaseType is set in config or data (no strategy needed)
    if (releaseType || selectedReleaseType) return true;

    const hasBumpStrategy = Boolean(bumpStrategy || selectedBumpStrategy);

    // Skip if no bump strategy is configured anywhere (config or data)
    if (!hasBumpStrategy) return true;

    return false;
}

/**
 * Generates a skip reason based on the current context.
 */
function getSkipReason(ctx: ReleaseContext): string {
    const { skipBump, releaseType, bumpStrategy } = ctx.config;
    const { selectedReleaseType, selectedBumpStrategy } = ctx.data;

    if (skipBump) return "skipBump is enabled";
    if (releaseType) return `releaseType already set to '${releaseType}' (config)`;
    if (selectedReleaseType) return `releaseType already set to '${selectedReleaseType}' (data)`;
    const hasBumpStrategy = Boolean(bumpStrategy || selectedBumpStrategy);
    if (!hasBumpStrategy) return "no bumpStrategy configured";

    return "unknown reason";
}

export function createDelegateBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("delegate-bump-strategy")
        .description("Delegates the version bump strategy decision")
        .dependsOn("initialize-release-version")
        .shouldSkip((ctx) => {
            const shouldSkip = shouldSkipBumpStrategy(ctx);
            const reason = shouldSkip ? getSkipReason(ctx) : undefined;

            return FireflyOk({ shouldSkip, reason });
        })
        .execute((ctx) => FireflyOkAsync(ctx))
        .build();
}
