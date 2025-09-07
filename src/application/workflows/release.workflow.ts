import { ok } from "neverthrow";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { GetInitialVersionTask } from "#/modules/semver/tasks/get-initial-version.task";
import { ProposeVersionBumpTask } from "#/modules/semver/tasks/propose-version-bump.task";

export function createReleaseWorkflow(): Workflow<"release"> {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Bump a new version, generate a changelog, and publish the release.",
        command: "release",
        buildTasks() {
            const tasks: Task[] = [new GetInitialVersionTask(), new ProposeVersionBumpTask()];

            return ok(tasks);
        },
    };
}
