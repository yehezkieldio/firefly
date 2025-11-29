/**
 * Create Tag Task
 *
 * Creates a git tag for the release version.
 *
 * @module commands/release/tasks/create-tag
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
 * Creates the Create Tag Task.
 *
 * This task creates a git tag using the configured tag name template.
 *
 * Skipped when: skipGit is enabled, or both skipBump and skipChangelog are enabled (nothing to tag)
 */
export function createCreateTagTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("create-tag")
        .description("Creates a git tag for the release")
        .dependsOn("commit-changes")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            logger.info("[create-tag] Creating release tag...");

            // TODO: Implement git tag creation

            return okAsync(ctx);
        })
        .build();
}
