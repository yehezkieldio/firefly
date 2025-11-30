import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createPromptBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-bump-strategy")
        .description("Prompts the user for a version bump strategy")
        .dependsOn("initialize-release-version")
        .skipWhenWithReason(
            // Execute when neither bumpStrategy nor releaseType is set
            (ctx) => ctx.config.skipBump || Boolean(ctx.config.bumpStrategy) || Boolean(ctx.config.releaseType),
            "Skipped: skipBump enabled, or bumpStrategy/releaseType already specified"
        )
        .execute((ctx) => {
            logger.info("prompt-bump-strategy");

            return FireflyOkAsync(ctx);
        })
        .build();
}
