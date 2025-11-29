/**
 * Stage Changes Task
 *
 * Stages modified files (package.json, changelog, etc.) for commit.
 *
 * @module commands/release/tasks/stage-changes
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
 * Creates the Stage Changes Task.
 *
 * This task stages all modified release files for commit.
 *
 * Skipped when: skipGit is enabled, or both skipBump and skipChangelog are enabled (nothing to stage)
 */
export function createStageChangesTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("stage-changes")
        .description("Stages modified files for commit")
        .dependsOn("generate-changelog")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            logger.info("[stage-changes] Staging changes...");

            // TODO: Implement git add for modified files

            return okAsync(ctx);
        })
        .build();
}
