import { ok } from "neverthrow";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { ReleasePreflightCheckTask } from "#/modules/orchestration/tasks";
import {
    AutomaticBumpTask,
    BumpVersionTask,
    ExecuteBumpStrategyTask,
    InitializeCurrentVersionTask,
    ManualBumpTask,
    PromptBumpStrategyTask,
    PromptManualVersionTask,
    StraightBumpTask,
} from "#/modules/semver/tasks";

export function createReleaseWorkflow(): Workflow<"release"> {
    return {
        id: "release-workflow",
        name: "Release Workflow",
        description: "Bump a new version, generate a changelog, and publish the release.",
        command: "release",
        buildTasks() {
            const tasks: Task[] = [
                new ReleasePreflightCheckTask(),
                new InitializeCurrentVersionTask(),
                new StraightBumpTask(),
                new PromptBumpStrategyTask(),
                new ExecuteBumpStrategyTask(),
                new AutomaticBumpTask(),
                new PromptManualVersionTask(),
                new ManualBumpTask(),
                new BumpVersionTask(),
                // new PrepareChangelogDataTask(),
                // new WriteChangelogFileTask(),
                // new StageChangesTask(),
                // new CommitChangesTask(),
                // new CreateTagTask(),
                // new PushCommitTask(),
                // new PushTagTask(),
                // new PublishGitHubReleaseTask(),
            ];

            return ok(tasks);
        },
    };
}
