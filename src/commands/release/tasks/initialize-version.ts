/**
 * Initialize Current Version Task
 *
 * Loads the current version from package.json or initializes to 0.0.0.
 * The version is stored in the context data for subsequent tasks to use.
 *
 * @module commands/release/tasks/initialize-version
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

const DEFAULT_VERSION = "0.0.0";

interface PackageJson {
    version?: string;
}

/**
 * Creates the Initialize Current Version Task.
 *
 * This task loads the current version from package.json or initializes it to 0.0.0.
 * The version is stored in the context data for subsequent tasks to use.
 *
 * @example
 * ```ts
 * const task = createInitializeVersionTask();
 * // Task reads package.json version or defaults to "0.0.0"
 * // Updates context.data.currentVersion
 * ```
 */
export function createInitializeVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("initialize-version")
        .description("Loads the current version from package.json or initializes to 0.0.0")
        .dependsOn("prepare-config")
        .execute((ctx) => {
            logger.info("Initializing current version...");

            return ctx.services.fs
                .exists("package.json")
                .andThen((exists) => {
                    if (!exists) {
                        logger.verbose(`  ⚠ No package.json found, using default version: ${DEFAULT_VERSION}`);
                        return okAsync(DEFAULT_VERSION);
                    }

                    return ctx.services.fs
                        .readJson<PackageJson>("package.json")
                        .map((pkg) => {
                            const version = pkg.version ?? DEFAULT_VERSION;
                            logger.verbose(`  ✓ Found version in package.json: ${version}`);
                            return version;
                        })
                        .orElse(() => {
                            logger.verbose(
                                `  ⚠ Failed to read package.json, using default version: ${DEFAULT_VERSION}`
                            );
                            return okAsync(DEFAULT_VERSION);
                        });
                })
                .map((version) => {
                    logger.info(`  Current version: ${version}`);
                    return ctx.fork("currentVersion", version);
                });
        })
        .build();
}
