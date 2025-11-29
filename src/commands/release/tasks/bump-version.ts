/**
 * Bump Version Task
 *
 * Applies the determined version bump to package.json and updates
 * the context with the new version.
 *
 * @module commands/release/tasks/bump-version
 */

import { colors } from "consola/utils";
import { okAsync } from "neverthrow";
import z from "zod";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import {
    type FireflyAsyncResult,
    FireflyOkAsync,
    type FireflyResult,
    notFoundErrAsync,
    validationErrAsync,
} from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

/**
 * Minimal package.json structure for version updates.
 * Uses catchall to preserve all other fields during updates.
 */
const PackageJsonSchema = z
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

type PackageJson = z.infer<typeof PackageJsonSchema>;

// ============================================================================
// Version Update Logic
// ============================================================================

/** Regex pattern to match and replace the version field in package.json */
const VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

/**
 * Replaces the version string in package.json content while preserving formatting.
 *
 * Uses regex replacement instead of JSON.parse/stringify to maintain
 * original formatting, comments (if any), and whitespace.
 *
 * @param content - Raw package.json file content
 * @param newVersion - The new version string to insert
 * @returns Updated package.json content
 */
function replaceVersionInContent(content: string, newVersion: string): string {
    return content.replace(VERSION_REGEX, `$1"${newVersion}"$2`);
}

/**
 * Updates the version in package.json file.
 *
 * Reads the current package.json, replaces the version field,
 * writes back, and verifies the update succeeded.
 *
 * @param ctx - Workflow context with services and config
 * @param newVersion - The new version to write
 * @returns Async result indicating success or failure
 */
function updatePackageJsonVersion(ctx: ReleaseContext, newVersion: string): FireflyAsyncResult<void> {
    const { fs } = ctx.services;
    const dryRun = ctx.data.dryRun;

    return fs
        .read("package.json")
        .andThen((content) => {
            const updatedContent = replaceVersionInContent(content, newVersion);
            return fs.write("package.json", updatedContent, { dryRun });
        })
        .andThen(() => verifyVersionUpdate(ctx, newVersion));
}

/**
 * Verifies that the version was correctly written to package.json.
 *
 * Skipped in dry-run mode since no actual write occurred.
 *
 * @param ctx - Workflow context with services and config
 * @param expectedVersion - The version that should have been written
 * @returns Async result indicating verification success or failure
 */
function verifyVersionUpdate(ctx: ReleaseContext, expectedVersion: string): FireflyAsyncResult<void> {
    const { fs } = ctx.services;
    const dryRun = ctx.data.dryRun;

    if (dryRun) {
        logger.verbose("  ⊘ Dry run: skipping version verification");
        return FireflyOkAsync(undefined);
    }

    return fs.readJson<PackageJson>("package.json").andThen((pkg) => {
        if (pkg.version !== expectedVersion) {
            return validationErrAsync({
                message: `Version verification failed. Expected: ${expectedVersion}, found: ${pkg.version}`,
                source: "bump-version.verifyVersionUpdate",
            });
        }
        return FireflyOkAsync(undefined);
    });
}

/**
 * Restores the previous version in package.json (undo operation).
 *
 * @param ctx - Workflow context with services and config
 * @param previousVersion - The version to restore
 * @returns Async result indicating success or failure
 */
function restoreVersion(ctx: ReleaseContext, previousVersion: string): FireflyAsyncResult<void> {
    const { fs } = ctx.services;
    const dryRun = ctx.data.dryRun;

    logger.verbose(`  ↩ Restoring version to ${previousVersion}...`);

    return fs.read("package.json").andThen((content) => {
        const updatedContent = replaceVersionInContent(content, previousVersion);
        return fs.write("package.json", updatedContent, { dryRun });
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Bump Version Task.
 *
 * This task applies the version bump to package.json and updates
 * the context data with the new version. It preserves the original
 * package.json formatting using regex-based replacement.
 *
 * **Dependencies:** Requires `nextVersion` to be set in context data
 * by one of the bump strategy tasks.
 *
 * **Skipped when:** `skipBump` is enabled in config
 *
 * **Undo:** Restores the previous version from `currentVersion` in context
 *
 * @example
 * ```ts
 * const taskResult = createBumpVersionTask();
 * // Task reads nextVersion from context.data
 * // Updates package.json version field
 * // Verifies the write succeeded
 * ```
 */
export function createBumpVersionTask(): FireflyResult<Task> {
    /** Captured for undo operation - stores the version before bump */
    let capturedPreviousVersion: string | undefined;

    return TaskBuilder.create<ReleaseContext>("bump-version")
        .description("Applies version bump to package.json")
        .dependsOnAll("straight-bump", "automatic-bump", "prompt-manual-version", "prompt-bump-strategy")
        .skipWhenWithReason((ctx) => ctx.config.skipBump, "Skipped: skipBump is enabled")
        .execute((ctx) => {
            const nextVersion = ctx.data.nextVersion;
            const currentVersion = ctx.data.currentVersion;

            if (!nextVersion) {
                return notFoundErrAsync({
                    message: "No next version found in context. Ensure a bump strategy task has run.",
                    source: "bump-version.execute",
                });
            }

            // Capture current version for potential undo
            capturedPreviousVersion = currentVersion;

            logger.info("Updating package.json version...");
            logger.verbose(`  ○ ${currentVersion ?? "unknown"} → ${nextVersion}`);

            return updatePackageJsonVersion(ctx, nextVersion).map(() => {
                logger.success(`  ✓ Version updated to ${colors.cyan(nextVersion)}`);
                return ctx;
            });
        })
        .withUndo((ctx) => {
            if (!capturedPreviousVersion) {
                logger.verbose("  ⊘ No previous version captured, skipping undo");
                return okAsync(undefined);
            }

            return restoreVersion(ctx, capturedPreviousVersion).andThen(() => {
                logger.verbose(`  ✓ Version restored to ${capturedPreviousVersion}`);
                return okAsync(undefined);
            });
        })
        .build();
}
