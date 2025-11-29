/**
 * Prompt Manual Version Task
 *
 * Prompts the user to manually select a version bump type
 * when the bump strategy is set to "manual".
 *
 * @module commands/release/tasks/prompt-manual-version
 */

import { okAsync } from "neverthrow";
import { BUMP_STRATEGY_MANUAL, type ReleaseConfig } from "#/commands/release/config";
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
 * Creates the Prompt Manual Version Task.
 *
 * This task prompts the user to select a version bump type
 * (major, minor, patch, etc.) interactively.
 *
 * Executes when: bumpStrategy === "manual"
 */
export function createPromptManualVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-manual-version")
        .description("Prompts user to manually select version bump type")
        .dependsOn("execute-bump-strategy")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || ctx.config.bumpStrategy !== BUMP_STRATEGY_MANUAL,
            "Skipped: skipBump enabled or bumpStrategy is not 'manual'"
        )
        .execute((ctx) => {
            logger.info("[prompt-manual-version] Prompting for manual version selection...");

            // TODO: Implement interactive version selection prompt

            return okAsync(ctx);
        })
        .build();
}
