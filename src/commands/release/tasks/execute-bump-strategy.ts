/**
 * Execute Bump Strategy Task
 *
 * Executes the configured bump strategy (auto or manual) when a strategy
 * is specified but no explicit release type is provided.
 *
 * @module commands/release/tasks/execute-bump-strategy
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
 * Creates the Execute Bump Strategy Task.
 *
 * This task delegates to either the automatic bump or manual prompt task
 * based on the configured bump strategy.
 *
 * Executes when: !config.releaseType && Boolean(config.bumpStrategy)
 */
export function createExecuteBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("execute-bump-strategy")
        .description("Executes the configured bump strategy (auto or manual)")
        .dependsOn("initialize-version")
        .skipWhenWithReason(
            // Execute when bumpStrategy is set but releaseType is not
            (ctx) => Boolean(ctx.config.releaseType) || !ctx.config.bumpStrategy,
            "Skipped: releaseType is set or no bumpStrategy configured"
        )
        .execute((ctx) => {
            logger.info("[execute-bump-strategy] Executing bump strategy...");

            // TODO: Delegate to appropriate strategy task

            return okAsync(ctx);
        })
        .build();
}
