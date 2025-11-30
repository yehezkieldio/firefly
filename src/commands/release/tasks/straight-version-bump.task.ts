import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createStraightVersionBump(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("straight-version-bump")
        .description("Performs a direct version bump based on the configured release type")
        .dependsOn("initialize-release-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || ctx.config.releaseType === undefined,
            "Skipped: skipBump is enabled or no release type specified"
        )
        .execute((ctx) => {
            logger.info("straight-version-bump");

            return FireflyOkAsync(ctx);
        })
        .build();
}
