/**
 * Commit Changes Task
 *
 * Creates a release commit with the configured commit message.
 *
 * @module commands/release/tasks/commit-changes
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
 * Creates the Commit Changes Task.
 *
 * This task creates a release commit with the configured message template.
 *
 * Skipped when: skipGit is enabled, or both skipBump and skipChangelog are enabled (nothing to commit)
 */
export function createCommitChangesTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("commit-changes")
        .description("Creates a release commit")
        .dependsOn("stage-changes")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            logger.info("[commit-changes] Creating release commit...");

            // TODO: Implement git commit with message template

            return okAsync(ctx);
        })
        .build();
}
