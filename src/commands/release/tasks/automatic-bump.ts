/**
 * Automatic Bump Task
 *
 * Automatically determines the version bump based on commit messages
 * using conventional commits analysis.
 *
 * @module commands/release/tasks/automatic-bump
 */

import { okAsync } from "neverthrow";
import { BUMP_STRATEGY_AUTO, type ReleaseConfig } from "#/commands/release/config";
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
 * Creates the Automatic Bump Task.
 *
 * This task analyzes commit messages to automatically determine
 * the appropriate version bump (major, minor, patch).
 *
 * Executes when: bumpStrategy === "auto"
 */
export function createAutomaticBumpTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("automatic-bump")
        .description("Automatically determines version bump from commit messages")
        .dependsOn("execute-bump-strategy")
        .skipWhenWithReason(
            (ctx) => ctx.config.bumpStrategy !== BUMP_STRATEGY_AUTO,
            "Skipped: bumpStrategy is not 'auto'"
        )
        .execute((ctx) => {
            logger.info("[automatic-bump] Analyzing commits for automatic bump...");

            // TODO: Implement conventional commits analysis

            return okAsync(ctx);
        })
        .build();
}
