import { ok } from "neverthrow";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { AutomaticBumpTask } from "#/modules/semver/tasks/automatic-bump.task";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { ManualBumpTask } from "#/modules/semver/tasks/manual-bump.task";
import { PromptBumpStrategyTask } from "#/modules/semver/tasks/prompt-bump-strategy.task";
import { PromptManualVersionTask } from "#/modules/semver/tasks/prompt-manual-version.task";
import { StraightBumpTask } from "#/modules/semver/tasks/straight-bump.task";

export function createReleaseWorkflow(): Workflow<"release"> {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Bump a new version, generate a changelog, and publish the release.",
        command: "release",
        buildTasks() {
            const tasks: Task[] = [
                new InitializeCurrentVersionTask(),

                // releaseType is defined, so we can do a straight bump task
                // after straight bump task, we skip the rest and jump to the bump version task
                new StraightBumpTask(),

                // if releaseType is not defined, we prompt for a bump strategy
                new PromptBumpStrategyTask(),
                // this task delegates to either automatic or manual bump tasks
                new ExecuteBumpStrategyTask(),

                // if automatic, we do an automatic bump
                // then we skip the manual bump task and go to the bump version task
                new AutomaticBumpTask(),

                // we prompt for a manual version
                new PromptManualVersionTask(),
                // if manual, we do a manual bump
                // then we move to the bump version task
                new ManualBumpTask(),

                new BumpVersionTask(),
            ];

            return ok(tasks);
        },
    };
}
