import { ReleasePreflightTask } from "#/application/tasks/release-preflight.task";
import type { Workflow } from "#/modules/orchestration/core/contracts/workflow.interface";
import { fireflyOk } from "#/shared/utils/result.util";

export function createReleaseWorkflow(): Workflow<"release"> {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Bumps version, generates changelog, and publishes the release.",
        command: "release",

        buildTasks() {
            return fireflyOk([new ReleasePreflightTask()]);
        },
    };
}
