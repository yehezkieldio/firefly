/**
 * Bump Version Task
 *
 * Applies the determined version bump to package.json and updates
 * the context with the new version.
 *
 * @module commands/release/tasks/bump-version
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
 * Creates the Bump Version Task.
 *
 * This task applies the version bump to package.json and updates
 * the context data with the new version.
 *
 * Skipped when: skipBump is enabled
 */
export function createBumpVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("bump-version")
        .description("Applies version bump to package.json")
        .dependsOnAll("straight-bump", "automatic-bump", "prompt-manual-version", "prompt-bump-strategy")
        .skipWhenWithReason((ctx) => ctx.config.skipBump, "Skipped: skipBump is enabled")
        .execute((ctx) => {
            logger.info("[bump-version] Bumping version in package.json...");

            // TODO: Implement version bump logic

            return okAsync(ctx);
        })
        .build();
}
