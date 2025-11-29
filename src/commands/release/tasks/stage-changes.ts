/**
 * Stage Changes Task
 *
 * Stages modified files (package.json, changelog, etc.) for commit.
 * This task intelligently determines which files need staging based on
 * the current configuration and what operations have been performed.
 *
 * @module commands/release/tasks/stage-changes
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, FireflyOkAsync, type FireflyResult } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Constants
// ============================================================================

const PACKAGE_JSON = "package.json";
const DEFAULT_CHANGELOG_PATH = "CHANGELOG.md";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines which files should be staged based on configuration.
 *
 * Files to stage:
 * - package.json: If version bump was performed (!skipBump)
 * - changelog file: If changelog was generated (!skipChangelog)
 *
 * @param ctx - Workflow context with configuration
 * @returns Array of file paths to stage
 */
function getFilesToStage(ctx: ReleaseContext): string[] {
    const files: string[] = [];

    if (!ctx.config.skipBump) {
        files.push(PACKAGE_JSON);
    }

    if (!ctx.config.skipChangelog) {
        const changelogPath = ctx.config.changelogPath || DEFAULT_CHANGELOG_PATH;
        files.push(changelogPath);
    }

    return files;
}

/**
 * Stages the specified files for commit.
 *
 * @param ctx - Workflow context with services
 * @param files - File paths to stage
 * @returns Async result indicating success or failure
 */
function stageFiles(ctx: ReleaseContext, files: string[]): FireflyAsyncResult<void> {
    const { git } = ctx.services;
    const dryRun = ctx.data.dryRun;

    if (dryRun) {
        logger.verbose(`[stage-changes] Dry run: would stage ${files.join(", ")}`);
        return FireflyOkAsync(undefined);
    }

    return git.add(files).andThen(() => {
        logger.verbose(`[stage-changes] Staged files: ${files.join(", ")}`);
        return FireflyOkAsync(undefined);
    });
}

/**
 * Executes the staging operation with proper logging.
 *
 * @param ctx - Workflow context
 * @returns Updated context after staging
 */
function executeStaging(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const files = getFilesToStage(ctx);

    if (files.length === 0) {
        logger.verbose("[stage-changes] No files to stage, continuing...");
        return FireflyOkAsync(ctx);
    }

    const fileList = files.map((f) => colors.underline(f)).join(" and ");
    logger.info(`[stage-changes] Staging changes for ${fileList}`);

    return stageFiles(ctx, files).map(() => {
        logger.success("[stage-changes] Files staged successfully");
        return ctx;
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Stage Changes Task.
 *
 * This task stages all modified release files for commit. It determines
 * which files need staging based on the configuration:
 * - package.json when version bump is performed
 * - changelog file when changelog is generated
 *
 * **Dependencies:** generate-changelog (ensures version bump and changelog are done first)
 *
 * **Skipped when:** skipGit is enabled, or both skipBump and skipChangelog are enabled
 *
 * **Undo:** Files can remain staged as subsequent undo operations will handle commit rollback
 */
export function createStageChangesTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("stage-changes")
        .description("Stages modified files for commit")
        .dependsOn("generate-changelog")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute(executeStaging)
        .build();
}
