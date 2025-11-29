/**
 * Push Tag Task
 *
 * Pushes the release tag to the remote repository.
 *
 * @module commands/release/tasks/push-tag
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
 * Creates the Push Tag Task.
 *
 * This task pushes the release tag to the remote repository.
 *
 * Skipped when: skipGit or skipPush is enabled
 */
export function createPushTagTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("push-tag")
        .description("Pushes the release tag to remote")
        .dependsOn("push-commit")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || ctx.config.skipPush,
            "Skipped: skipGit or skipPush is enabled"
        )
        .execute((ctx) => {
            logger.info("[push-tag] Pushing release tag...");

            // TODO: Implement git push --tags

            return okAsync(ctx);
        })
        .build();
}
