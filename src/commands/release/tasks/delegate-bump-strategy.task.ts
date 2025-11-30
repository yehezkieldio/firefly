import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOk, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

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

    // Skip if bump is disabled
    if (skipBump) return true;

    // Skip if explicit releaseType is set (no need for strategy)
    if (releaseType) return true;

    // Skip if no bump strategy is configured
    if (!bumpStrategy) return true;

    return false;
}

/**
 * Generates a skip reason based on the current context.
 */
function getSkipReason(ctx: ReleaseContext): string {
    const { skipBump, releaseType, bumpStrategy } = ctx.config;

    if (skipBump) return "skipBump is enabled";
    if (releaseType) return `releaseType already set to '${releaseType}'`;
    if (!bumpStrategy) return "no bumpStrategy configured";

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
        .execute((ctx) => {
            logger.info("delegate-bump-strategy");

            return FireflyOkAsync(ctx);
        })
        .build();
}
