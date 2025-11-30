import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

export function createPrepareReleaseConfigTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prepare-release-config")
        .description("Hydrate and prepare the release configuration")
        .execute((ctx) => {
            logger.info("prepare-release-config");

            return FireflyOkAsync(ctx);
        })
        .build();
}
