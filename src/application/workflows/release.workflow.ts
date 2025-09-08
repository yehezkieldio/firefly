import { ok } from "neverthrow";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { ReleasePreflightCheckTask } from "#/modules/preflight/tasks";
import {
    BumpVersionTask,
    ExecuteBumpStrategyTask,
    InitializeCurrentVersionTask,
    PromptBumpStrategyTask,
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
                new VersionFlowControllerTask(),
                new StraightBumpTask(),
                new PromptBumpStrategyTask(),
                new ExecuteBumpStrategyTask(),
                // new AutomaticBumpTask(),
                // new PromptManualVersionTask(),
                // new ManualBumpTask(),
                new BumpVersionTask(),
                new ChangelogFlowControllerTask(),
                // new GenerateChangelogTask(),
                // new WriteChangelogFileTask(),
                // new GitFlowControllerTask(),
                // new StageChangesTask(),
                // new CommitChangesTask(),
                // new CreateTagTask(),
                // new PushCommitTask(),
                // new PushTagTask(),
                // new PlatformPublishControllerTask(),
                // new PublishGitHubReleaseTask(),
            ];

            return ok(tasks);
        },
    };
}
