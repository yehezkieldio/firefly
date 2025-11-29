/**
 * Straight Bump Task
 *
 * Performs a direct version bump when a specific release type is provided
 * in the configuration. This task is used when the user explicitly specifies
 * the bump type (major, minor, patch, etc.) without interactive prompting.
 *
 * @module commands/release/tasks/straight-bump
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
 * Creates the Straight Bump Task.
 *
 * This task is executed when the user provides a specific release type
 * (e.g., "major", "minor", "patch") in the configuration. It logs the
 * current version and prepares for the version bump.
 *
 * This is the first step in the "direct bump" flow, as opposed to the
 * "prompted bump" flow where the user selects the bump type interactively.
 *
 * @example
 * ```ts
 * const task = createStraightBumpTask();
 * // When config.releaseType is defined (e.g., "minor")
 * // Logs current version and prepares for bump calculation
 * ```
 */
export function createStraightBumpTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("straight-bump")
        .description("Performs a direct version bump based on the configured release type")
        .dependsOn("initialize-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.releaseType === undefined,
            "No release type specified, will prompt for bump strategy"
        )
        .execute((ctx) => {
            const currentVersion = ctx.data.currentVersion ?? "0.0.0";
            const releaseType = ctx.config.releaseType;

            logger.info(`Preparing ${releaseType} version bump...`);
            logger.info(`  Current version: ${currentVersion}`);
            logger.verbose(`  Release type: ${releaseType}`);

            // TODO: Calculate next version based on release type
            // For now, just log the current state

            return okAsync(ctx);
        })
        .build();
}
