import { ok } from "neverthrow";
import { GenerateChangelogTask, WriteChangelogFileTask } from "#/modules/changelog/tasks";
import { ReleasePreflightCheckTask } from "#/modules/configuration/tasks";
import { CommitChangesTask, CreateTagTask, PushCommitTask, PushTagTask, StageChangesTask } from "#/modules/git/tasks";
import { PublishGitHubReleaseTask } from "#/modules/github/tasks";
import type { Task } from "#/modules/orchestration/contracts/task.interface";
import type { Workflow } from "#/modules/orchestration/contracts/workflow.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { GitFlowControllerTask } from "#/modules/orchestration/tasks/git-flow-controller.task";
import { PlatformPublishControllerTask } from "#/modules/orchestration/tasks/platform-publish-controller.task";
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
