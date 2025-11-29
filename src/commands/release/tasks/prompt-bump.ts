/**
 * Prompt Bump Strategy Task
 *
 * Prompts the user to select a bump strategy when no specific release type
 * is provided in the configuration. This task provides an interactive flow
 * for determining how to bump the version.
 *
 * @module commands/release/tasks/prompt-bump
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
 * Creates the Prompt Bump Strategy Task.
 *
 * This task is executed when no specific release type is provided in the
 * configuration. It will prompt the user to select a bump strategy
 * (major, minor, patch, etc.) interactively.
 *
 * This is the first step in the "prompted bump" flow, as opposed to the
 * "direct bump" flow where the user specifies the release type upfront.
 *
 * @example
 * ```ts
 * const task = createPromptBumpStrategyTask();
 * // When config.releaseType is undefined
 * // Prompts user to select bump strategy
 * ```
 */
export function createPromptBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-bump")
        .description("Prompts the user to select a version bump strategy")
        .dependsOn("initialize-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.releaseType !== undefined,
            "Release type already specified, using direct bump"
        )
        .execute((ctx) => {
            const currentVersion = ctx.data.currentVersion ?? "0.0.0";
            const bumpStrategy = ctx.config.bumpStrategy;

            logger.info("Prompting for bump strategy...");
            logger.info(`  Current version: ${currentVersion}`);

            if (bumpStrategy) {
                logger.verbose(`  Configured bump strategy: ${bumpStrategy}`);
            }

            // TODO: Implement interactive prompt for bump strategy selection
            // For now, just log the current state

            return okAsync(ctx);
        })
        .build();
}
