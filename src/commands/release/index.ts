import { errAsync, okAsync, Result } from "neverthrow";
import { createCommand } from "#/command-registry/command-types";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import { createPreflightTask } from "#/commands/release/tasks/preflight";
import { TaskBuilder } from "#/task-system/task-builder";
import { logger } from "#/utils/log";

export const releaseCommand = createCommand<ReleaseConfig, ReleaseData>({
    meta: {
        name: "release",
        description: "Automated semantic versioning, changelog generation, and GitHub release creation",
        configSchema: ReleaseConfigSchema,
    },

    buildTasks(context) {
        const taskResults = [
            createPreflightTask(() => context.config.skipPreflightCheck === true),
            TaskBuilder.create("init-version")
                .description("Load current version from package.json")
                .execute((ctx) => {
                    logger.info("Hello, world!");
                    return okAsync(ctx);
                })
                .build(),
        ];

        const combined = Result.combine(taskResults);
        if (combined.isErr()) {
            return errAsync(combined.error);
        }

        return okAsync(combined.value);
    },
});
