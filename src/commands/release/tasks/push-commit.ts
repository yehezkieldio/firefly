/**
 * Push Commit Task
 *
 * Pushes the release commit to the remote repository.
 *
 * @module commands/release/tasks/push-commit
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
 * Creates the Push Commit Task.
 *
 * This task pushes the release commit to the remote repository.
 *
 * Skipped when: skipGit or skipPush is enabled
 */
export function createPushCommitTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("push-commit")
        .description("Pushes the release commit to remote")
        .dependsOn("create-tag")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || ctx.config.skipPush,
            "Skipped: skipGit or skipPush is enabled"
        )
        .execute((ctx) => {
            logger.info("[push-commit] Pushing release commit...");

            // TODO: Implement git push

            return okAsync(ctx);
        })
        .build();
}
