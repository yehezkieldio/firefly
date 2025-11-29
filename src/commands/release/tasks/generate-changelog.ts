/**
 * Generate Changelog Task
 *
 * Generates or updates the changelog file based on commits
 * since the last release.
 *
 * @module commands/release/tasks/generate-changelog
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
 * Creates the Generate Changelog Task.
 *
 * This task generates or updates the changelog file based on
 * commits since the last release.
 *
 * Skipped when: skipChangelog is enabled
 * Dependencies: bump-version (or initialize-version if skipBump)
 */
export function createGenerateChangelogTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("generate-changelog")
        .description("Generates or updates the changelog file")
        .dependsOn("bump-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipChangelog || (ctx.config.skipBump && ctx.config.skipGit),
            "Skipped: skipChangelog is enabled, or both skipBump and skipGit are enabled"
        )
        .execute((ctx) => {
            logger.info("[generate-changelog] Generating changelog...");

            // TODO: Implement changelog generation

            return okAsync(ctx);
        })
        .build();
}
