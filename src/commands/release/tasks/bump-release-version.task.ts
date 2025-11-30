import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createBumpReleaseVersion(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("bump-release-version")
        .description("Applies the new version bump to relevant files")
        .dependsOnAll(
            "straight-version-bump",
            "determine-automatic-bump",
            "prompt-manual-version",
            "prompt-bump-strategy"
        )
        .skipWhenWithReason((ctx) => ctx.config.skipBump, "Skipped: skipBump is enabled")
        .execute((ctx) => {
            logger.info("bump-release-version");

            return FireflyOkAsync(ctx);
        })
        .build();
}
