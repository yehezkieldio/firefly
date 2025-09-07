import { ok } from "neverthrow";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { AutomaticBumpTask } from "#/modules/semver/tasks/automatic-bump.task";
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

                // If params are provided skip all tasks below and straight to straight bump
                new StraightBumpTask(),

                // If no bump params are provided, run the interactive tasks
                new PromptBumpStrategyTask(),

                // If strategy is auto then run just the automatic bump task
                // If strategy is manual then run the prompt and manual bump tasks
                new ExecuteBumpStrategyTask(),
                new AutomaticBumpTask(),

                // If manual then we need to prompt for the version and then bump
                new PromptManualVersionTask(),
                new ManualBumpTask(),
            ];

            return ok(tasks);
        },
    };
}
