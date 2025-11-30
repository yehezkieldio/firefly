import { createReleaseGroups } from "#/commands/release/groups/setup.group";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/release.config";
import type { ReleaseData } from "#/commands/release/release.data";
import { createCommand } from "#/core/command/command.factory";
import { FireflyErrAsync, FireflyOkAsync } from "#/core/result/result.constructors";
import { defineServiceKeys } from "#/core/service/service.registry";
import { getGraphStatistics } from "#/core/task/task.graph";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

const RELEASE_SERVICES = defineServiceKeys("fs");

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

        const showGraph =
            Boolean(process.env.FIREFLY_DEBUG_RELEASE_SHOW_GRAPH_STATS?.trim()) ||
            Boolean(process.env.FIREFLY_DEBUG_SHOW_GRAPH_STATS?.trim());
        if (showGraph) {
            const stats = getGraphStatistics(tasks);

            logger.verbose("");
            logger.verbose("R");
            logger.verbose(`Total tasks: ${stats.totalTasks}`);
            logger.verbose(`Root tasks (can run first): ${stats.rootTasks}`);
            logger.verbose(`Leaf tasks (final): ${stats.leafTasks}`);
            logger.verbose(`Max depth: ${stats.maxDepth}`);
            logger.verbose(`Avg dependencies: ${stats.avgDependencies.toFixed(2)}`);

            if (stats.mostDependentTasks.length > 0) {
                logger.verbose(`Most dependent tasks: ${stats.mostDependentTasks.join(", ")}`);
            }

            if (stats.mostDependendUponTasks.length > 0) {
                logger.verbose(`Critical path tasks: ${stats.mostDependendUponTasks.join(", ")}`);
            }

            logger.verbose("");
        }

        return FireflyOkAsync(tasks);
    },
});
