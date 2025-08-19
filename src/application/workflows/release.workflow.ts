import type { Workflow } from "#/modules/orchestration/core/contracts/workflow.interface";
import { fireflyOk } from "#/shared/utils/result.util";

export function createReleaseWorkflow(): Workflow<"release"> {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Bump a new version, generate a changelog, and publish the release.",
        command: "release",

        buildTasks() {
            return fireflyOk([]);
        },
    };
}
