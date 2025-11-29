/**
 * Execute Bump Strategy Task
 *
 * Executes the configured bump strategy (auto or manual) when a strategy
 * is specified but no explicit release type is provided.
 *
 * This task acts as a routing point for version bump strategies:
 * - When bumpStrategy is "auto": delegates to automatic-bump task
 * - When bumpStrategy is "manual": delegates to prompt-manual-version task
 *
 * The delegation is implicit through the dependency graph - downstream tasks
 * (automatic-bump, prompt-manual-version) depend on this task and use their
 * own skip conditions to determine execution.
 *
 * @module commands/release/tasks/execute-bump-strategy
 */

import { ok, okAsync } from "neverthrow";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL, type ReleaseConfig } from "#/commands/release/config";
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
 * Determines if the execute-bump-strategy task should be skipped.
 *
 * The task should execute when:
 * - No explicit releaseType is set (need to determine version bump)
 * - A bumpStrategy is configured (auto or manual)
 * - skipBump is not enabled
 */
function shouldSkipBumpStrategy(ctx: ReleaseContext): boolean {
    const { skipBump, releaseType, bumpStrategy } = ctx.config;

    // Skip if bump is disabled
    if (skipBump) return true;

    // Skip if explicit releaseType is set (no need for strategy)
    if (releaseType) return true;

    // Skip if no bump strategy is configured
    if (!bumpStrategy) return true;

    return false;
}

/**
 * Generates a skip reason based on the current context.
 */
function getSkipReason(ctx: ReleaseContext): string {
    const { skipBump, releaseType, bumpStrategy } = ctx.config;

    if (skipBump) return "skipBump is enabled";
    if (releaseType) return `releaseType already set to '${releaseType}'`;
    if (!bumpStrategy) return "no bumpStrategy configured";

    return "unknown reason";
}

/**
 * Creates the Execute Bump Strategy Task.
 *
 * This task serves as a routing/delegation point for version bump strategies.
 * Based on the configured `bumpStrategy`, it enables downstream tasks:
 *
 * - `bumpStrategy: "auto"` → enables `automatic-bump` task
 * - `bumpStrategy: "manual"` → enables `prompt-manual-version` task
 *
 * The actual version determination logic is handled by the downstream tasks.
 * This task validates the strategy configuration and logs the delegation.
 *
 * Dependency chain:
 * ```
 * initialize-version
 *        ↓
 * execute-bump-strategy
 *        ↓
 *   ┌────┴────┐
 *   ↓         ↓
 * auto    manual
 * bump    prompt
 *   └────┬────┘
 *        ↓
 *   bump-version
 * ```
 */
export function createExecuteBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("execute-bump-strategy")
        .description("Executes the configured bump strategy (auto or manual)")
        .dependsOn("initialize-version")
        .shouldSkip((ctx) => {
            const shouldSkip = shouldSkipBumpStrategy(ctx);
            const reason = shouldSkip ? getSkipReason(ctx) : undefined;

            return ok({ shouldSkip, reason });
        })
        .execute((ctx) => {
            const { bumpStrategy } = ctx.config;

            logger.info(`[execute-bump-strategy] Delegating to bump strategy: ${bumpStrategy}`);

            if (bumpStrategy === BUMP_STRATEGY_AUTO) {
                logger.verbose("[execute-bump-strategy] → automatic-bump task will analyze commits");
            } else if (bumpStrategy === BUMP_STRATEGY_MANUAL) {
                logger.verbose("[execute-bump-strategy] → prompt-manual-version task will prompt user");
            }

            // No direct work here - delegation happens through dependency graph
            // Downstream tasks (automatic-bump, prompt-manual-version) will execute
            // based on their own skip conditions

            return okAsync(ctx);
        })
        .build();
}
