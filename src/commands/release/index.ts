import { errAsync, okAsync } from "neverthrow";
import { createCommand } from "#/command-registry/command-types";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import { createReleaseGroups } from "#/commands/release/groups";
import type { Task } from "#/task-system/task-types";

const RELEASE_SERVICES = ["fs", "git"] as const;

export const releaseCommand = createCommand<ReleaseConfig, ReleaseData, typeof RELEASE_SERVICES>({
    meta: {
        name: "release",
        description: "Automated semantic versioning, changelog generation, and GitHub release creation",
        configSchema: ReleaseConfigSchema,
        requiredServices: RELEASE_SERVICES,
    },

    buildTasks(context) {
        const groupsResult = createReleaseGroups(context.config.skipPreflightCheck === true);
        if (groupsResult.isErr()) {
            return errAsync(groupsResult.error);
        }

        // Flatten groups into tasks for backward compatibility
        // The groups maintain their logical organization while tasks are executed sequentially
        const tasks: Task[] = groupsResult.value.flatMap((group) => group.tasks);
        return okAsync(tasks);
    },
});
