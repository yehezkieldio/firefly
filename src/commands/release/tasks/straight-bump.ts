/**
 * Straight Bump Task
 *
 * Performs a direct version bump when a specific release type is provided
 * in the configuration. This task is used when the user explicitly specifies
 * the bump type (major, minor, patch, etc.) without interactive prompting.
 *
 * @module commands/release/tasks/straight-bump
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import { Version } from "#/semver/version";
import { resolveNextVersion, type VersionDecisionOptions } from "#/semver/version-resolver";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { validationError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";
import { FireflyErr, FireflyErrAsync, FireflyOkAsync } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates and parses the current version from context.
 * Returns an error result if the version is missing or invalid.
 */
function parseCurrentVersion(currentVersionRaw: string | undefined): FireflyResult<Version> {
    if (!currentVersionRaw) {
        return FireflyErr(
            validationError({
                message: "Current version not found in context. Ensure initialize-version task ran first.",
                source: "commands/release/tasks/straight-bump",
            })
        );
    }

    return Version.from(currentVersionRaw);
}

// ============================================================================
// Version Resolution
// ============================================================================

/**
 * Builds the version decision options from the release context.
 */
function buildVersionDecisionOptions(currentVersion: Version, config: ReleaseConfig): VersionDecisionOptions {
    return {
        currentVersion,
        releaseType: config.releaseType,
        prereleaseIdentifier: config.preReleaseId,
        prereleaseBase: config.preReleaseBase,
    };
}

/**
 * Resolves the next version based on the explicit release type.
 * Uses the version resolver to handle all release type scenarios.
 */
function resolveVersionBump(currentVersion: Version, config: ReleaseConfig): FireflyResult<Version> {
    const options = buildVersionDecisionOptions(currentVersion, config);
    return resolveNextVersion(options);
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Logs the version bump result with formatted output.
 */
function logVersionBump(releaseType: string, currentVersion: Version, nextVersion: Version): void {
    logger.verbose(
        `[straight-bump] Release type: ${colors.bold(releaseType)} | ` +
            `Version: '${currentVersion.raw}' → '${nextVersion.raw}'`
    );
    logger.info(`[straight-bump] Next version: ${colors.cyan(nextVersion.raw)}`);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates the Straight Bump Task.
 *
 * This task is executed when the user provides a specific release type
 * (e.g., "major", "minor", "patch", "prerelease", "graduate") in the configuration.
 * It calculates the next version based on the current version and the specified
 * release type, then updates the workflow context with the result.
 *
 * Supported release types:
 * - Standard: major, minor, patch
 * - Pre-release: prerelease, premajor, preminor, prepatch
 * - Graduation: graduate (promotes pre-release to stable)
 *
 * Executes when: config.releaseType is defined AND skipBump is false
 *
 * @example
 * ```ts
 * const task = createStraightBumpTask();
 * // When config.releaseType is "minor" and currentVersion is "1.0.0"
 * // Result: nextVersion = "1.1.0"
 * ```
 */
export function createStraightBumpTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("straight-bump")
        .description("Performs a direct version bump based on the configured release type")
        .dependsOn("execute-bump-strategy")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || ctx.config.releaseType === undefined,
            "Skipped: skipBump is enabled or no release type specified"
        )
        .execute((ctx): FireflyAsyncResult<ReleaseContext> => {
            logger.info("[straight-bump] Resolving version from explicit release type...");

            // Parse and validate current version
            const currentVersionResult = parseCurrentVersion(ctx.data.currentVersion);
            if (currentVersionResult.isErr()) {
                return FireflyErrAsync(currentVersionResult.error);
            }

            const currentVersion = currentVersionResult.value;

            // Release type is guaranteed by skipWhen condition
            const releaseType = ctx.config.releaseType;
            if (!releaseType) {
                return FireflyErrAsync({
                    code: "VALIDATION",
                    message: "Release type is required for straight bump. This should not happen.",
                });
            }

            logger.verbose(`[straight-bump] Current version: ${currentVersion.raw}`);
            logger.verbose(`[straight-bump] Release type: ${releaseType}`);

            // Resolve the next version
            const nextVersionResult = resolveVersionBump(currentVersion, ctx.config);
            if (nextVersionResult.isErr()) {
                return FireflyErrAsync(nextVersionResult.error);
            }

            const nextVersion = nextVersionResult.value;

            // Log the result
            logVersionBump(releaseType, currentVersion, nextVersion);

            // Update context with the next version
            return FireflyOkAsync(ctx.fork("nextVersion", nextVersion.raw));
        })
        .build();
}
