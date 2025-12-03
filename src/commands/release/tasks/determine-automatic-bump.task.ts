import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { BUMP_STRATEGY_AUTO } from "#/domain/semver/semver.strategies";
import { logger } from "#/infrastructure/logging";

export function createDetermineAutomaticBump(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("determine-automatic-bump")
        .description("Automatically determines the version bump from commit messages")
        .dependsOn("delegate-bump-strategy")
        .skipWhenWithReason((ctx) => {
            const bumpStrategy = ctx.data.selectedBumpStrategy ?? ctx.config.bumpStrategy;
            return ctx.config.skipBump || bumpStrategy !== BUMP_STRATEGY_AUTO;
        }, "Skipped: skipBump enabled or bumpStrategy is not 'auto'")
        .execute((ctx) => {
            logger.info("determine-automatic-bump");

            return FireflyOkAsync(ctx);
        })
        .build();
}
