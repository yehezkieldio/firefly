import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { BUMP_STRATEGY_MANUAL } from "#/domain/semver/semver.strategies";
import { logger } from "#/infrastructure/logging";

export function createPromptManualVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-manual-version")
        .description("Prompts the user for a manual version bump selections")
        .dependsOn("delegate-bump-strategy")
        .skipWhenWithReason((ctx) => {
            const bumpStrategy = ctx.data.selectedBumpStrategy ?? ctx.config.bumpStrategy;
            return ctx.config.skipBump || bumpStrategy !== BUMP_STRATEGY_MANUAL;
        }, "Skipped: skipBump enabled or bumpStrategy is not 'manual'")
        .execute((ctx) => {
            logger.info("prompt-manual-version");

            return FireflyOkAsync(ctx);
        })
        .build();
}
