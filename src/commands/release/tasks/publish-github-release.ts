/**
 * Publish GitHub Release Task
 *
 * Creates a GitHub release with the changelog content.
 *
 * @module commands/release/tasks/publish-github-release
 */

import { okAsync } from "neverthrow";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import type { FireflyResult } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

/**
 * Creates the Publish GitHub Release Task.
 *
 * This task creates a GitHub release using the GitHub API.
 *
 * Skipped when: skipGitHubRelease, skipGit, or both skipBump and skipChangelog are enabled
 */
export function createPublishGitHubReleaseTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("publish-github-release")
        .description("Creates a GitHub release")
        .dependsOn("push-tag")
        .skipWhenWithReason(
            (ctx) =>
                ctx.config.skipGitHubRelease || ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGitHubRelease, skipGit, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            logger.info("[publish-github-release] Publishing GitHub release...");

            // TODO: Implement GitHub release creation via API

            return okAsync(ctx);
        })
        .build();
}
