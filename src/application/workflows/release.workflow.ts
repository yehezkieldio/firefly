import { ok } from "neverthrow";
import { WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { GenerateChangelogTask } from "#/modules/changelog/tasks/generate-changelog.task";
import { CommitChangesTask, CreateTagTask, PushCommitTask, PushTagTask, StageChangesTask } from "#/modules/git/tasks";
import { PublishGitHubReleaseTask } from "#/modules/github/tasks";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import {
    ChangelogFlowControllerTask,
    GitFlowControllerTask,
    PlatformPublishControllerTask,
    VersionFlowControllerTask,
} from "#/modules/orchestration/tasks";
import { ReleasePreflightCheckTask } from "#/modules/preflight/tasks";
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

export function createReleaseWorkflow_sequential(): Workflow<"release"> {
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
                new AutomaticBumpTask(),
                new PromptManualVersionTask(),
                new ManualBumpTask(),
                new BumpVersionTask(),

                new ChangelogFlowControllerTask(),
                new GenerateChangelogTask(),
                new WriteChangelogFileTask(),

                new GitFlowControllerTask(),
                new StageChangesTask(),
                new CommitChangesTask(),
                new CreateTagTask(),
                new PushCommitTask(),
                new PushTagTask(),

                new PlatformPublishControllerTask(),
                new PublishGitHubReleaseTask(),
            ];

            return ok(tasks);
        },
    };
}
