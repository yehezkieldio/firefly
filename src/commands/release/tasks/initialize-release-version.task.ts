import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createInitializeReleaseVersion(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("initialize-release-version")
        .description("Hydrate and prepare the release configuration")
        .execute((ctx) => {
            logger.info("initialize-release-version");

            return FireflyOkAsync(ctx);
        })
        .build();
}
