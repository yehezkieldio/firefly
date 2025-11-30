import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createReleasePreflightTask(skipCondition: () => boolean): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("release-preflight")
        .description("Validate environment and prerequisites for a release")
        .skipWhen(skipCondition)
        .execute((ctx) => {
            logger.info("Hello, world!");

            return FireflyOkAsync(ctx);
        })
        .build();
}
