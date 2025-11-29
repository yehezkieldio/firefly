/**
 * Create Tag Task
 *
 * Creates a git tag for the release version.
 * Supports annotated tags with configurable tag name templates.
 *
 * @module commands/release/tasks/create-tag
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { resolveTemplateString } from "#/services/template-service";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { executeGitCommand } from "#/utils/git-command-executor";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, FireflyOkAsync, type FireflyResult, notFoundErrAsync } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolves the tag name using template placeholders.
 *
 * Supported placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope if present)
 * - {{unscopedName}} - Package name without scope
 *
 * @param ctx - Workflow context with configuration and data
 * @returns Resolved tag name string
 */
function resolveTagName(ctx: ReleaseContext): string {
    const { config, data } = ctx;

    return resolveTemplateString(config.tagName, {
        version: data.nextVersion,
        name: config.name,
        scope: config.scope,
    });
}

/**
 * Resolves the release title for tag annotation.
 *
 * @param ctx - Workflow context with configuration and data
 * @returns Resolved release title string
 */
function resolveReleaseTitle(ctx: ReleaseContext): string {
    const { config, data } = ctx;

    return resolveTemplateString(config.releaseTitle, {
        version: data.nextVersion,
        name: config.name,
        scope: config.scope,
    });
}

/**
 * Creates an annotated git tag.
 *
 * @param ctx - Workflow context with services
 * @param tagName - Name of the tag to create
 * @param message - Annotation message for the tag
 * @returns Async result indicating success or failure
 */
function createTag(ctx: ReleaseContext, tagName: string, message: string): FireflyAsyncResult<void> {
    const { git } = ctx.services;
    const dryRun = ctx.data.dryRun;

    return git.tag(tagName, { message, dryRun }).andThen(() => {
        logger.verbose(`[create-tag] Tag created: ${tagName}`);
        return FireflyOkAsync(undefined);
    });
}

/**
 * Deletes a local git tag.
 * This is used for undo operations to roll back tag creation.
 *
 * @param tagName - Name of the tag to delete
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function deleteLocalTag(tagName: string, dryRun?: boolean): FireflyAsyncResult<void> {
    if (dryRun) {
        logger.verbose(`[create-tag] Dry run: would delete local tag ${tagName}`);
        return FireflyOkAsync(undefined);
    }

    return executeGitCommand(["tag", "-d", tagName], { verbose: false }).andThen(() => {
        logger.verbose(`[create-tag] Deleted local tag: ${tagName}`);
        return FireflyOkAsync(undefined);
    });
}

/**
 * Executes the tag creation with proper validation and logging.
 *
 * @param ctx - Workflow context
 * @returns Updated context after tag creation
 */
function executeTagCreation(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const { data } = ctx;

    if (!data.nextVersion) {
        return notFoundErrAsync({
            message: "No next version found in context. Ensure bump task has run.",
            source: "create-tag.execute",
        });
    }

    const tagName = resolveTagName(ctx);
    const releaseTitle = resolveReleaseTitle(ctx);

    logger.info("[create-tag] Creating release tag...");
    logger.verbose(`[create-tag] Tag name: ${colors.gray(tagName)}`);
    logger.verbose(`[create-tag] Tag message: ${colors.gray(releaseTitle)}`);

    return createTag(ctx, tagName, releaseTitle).map(() => {
        logger.success(`[create-tag] Created tag: ${colors.cyan(tagName)}`);
        return ctx;
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Create Tag Task.
 *
 * This task creates an annotated git tag using the configured tag name template.
 * Tag names support template placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope)
 * - {{unscopedName}} - Package name without scope
 *
 * **Dependencies:** commit-changes (ensures release commit exists before tagging)
 *
 * **Skipped when:** skipGit is enabled, or both skipBump and skipChangelog are enabled
 *
 * **Undo:** Deletes the local tag using `git tag -d <tagName>`
 */
export function createCreateTagTask(): FireflyResult<Task> {
    /** Captured for undo operation - stores the tag name that was created */
    let capturedTagName: string | undefined;

    return TaskBuilder.create<ReleaseContext>("create-tag")
        .description("Creates a git tag for the release")
        .dependsOn("commit-changes")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            // Capture tag name for potential undo
            capturedTagName = resolveTagName(ctx);
            return executeTagCreation(ctx);
        })
        .withUndo((ctx) => {
            if (!capturedTagName) {
                logger.verbose("[create-tag] No tag name captured, skipping undo");
                return FireflyOkAsync(undefined);
            }

            logger.verbose(`[create-tag] Undoing: deleting tag ${capturedTagName}...`);
            return deleteLocalTag(capturedTagName, ctx.data.dryRun).andThen(() => {
                logger.verbose(`[create-tag] Undo complete: tag ${capturedTagName} deleted`);
                return FireflyOkAsync(undefined);
            });
        })
        .build();
}
