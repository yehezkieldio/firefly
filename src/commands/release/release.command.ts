import { createReleaseGroups } from "#/commands/release/groups/setup.group";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/release.config";
import type { ReleaseData } from "#/commands/release/release.data";
import { createCommand } from "#/core/command/command.factory";
import { FireflyErrAsync, FireflyOkAsync } from "#/core/result/result.constructors";
import { defineServiceKeys } from "#/core/service/service.registry";
import { getGraphStatistics, logGraphStatistics } from "#/core/task/task.graph";
import type { Task } from "#/core/task/task.types";

export const RELEASE_SERVICES = defineServiceKeys("fs", "git");

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
            return FireflyErrAsync(groupsResult.error);
        }

        const tasks: Task[] = groupsResult.value.flatMap((group) => group.tasks);

        const showGraph = Boolean(process.env.FIREFLY_DEBUG_SHOW_TASK_GRAPH_STATS?.trim());
        if (showGraph) logGraphStatistics(getGraphStatistics(tasks));

        return FireflyOkAsync(tasks);
    },
});
