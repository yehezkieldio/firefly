/**
 * Version-related tasks for release command.
 */

import { okAsync } from "neverthrow";
import { TaskBuilder } from "#/rewrite/task-system/task-builder";
import { FileSystemService } from "#/rewrite/shared/filesystem";
import { VersionService } from "#/rewrite/shared/version";
import { GitService } from "#/rewrite/shared/git";
import { ConventionalCommitService } from "#/rewrite/shared/conventional-commit";
import { PromptService} from "#/rewrite/shared/prompts";
import { logger } from "#/shared/logger";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";
import type { ReleaseConfig } from "#/rewrite/commands/release/config";
import type { ReleaseData } from "#/rewrite/commands/release/types";

/**
 * Initialize current version from package.json.
 */
export function createInitVersionTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("init-version")
        .description("Load current version from package.json")
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const fs = new FileSystemService();
            const result = await fs.readPackageJson();

            if (result.isErr()) {
                logger.error("Failed to read package.json:", result.error.message);
                return result;
            }

            const version = result.value.version || "0.0.0";
            logger.info(`Current version: ${version}`);

            return okAsync(ctx.fork("currentVersion", version));
        })
        .build();
}

/**
 * Calculate next version based on bump strategy.
 * Runtime skip: Skipped if bump strategy is "manual" and manual version is provided.
 */
export function createCalculateVersionTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("calculate-version")
        .description("Determine next version based on strategy")
        .dependsOn("init-version")
        .skipWhen((ctx) => {
            // Skip if manual version is already provided
            const config = ctx.config as ReleaseConfig;
            return config.bumpStrategy === "manual" && !!config.manualVersion;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const config = ctx.config as ReleaseConfig;
            const currentVersion = ctx.data.currentVersion as string;

            if (!currentVersion) {
                logger.error("Current version not found in context");
                return okAsync(ctx);
            }

            const versionService = new VersionService();

            // Strategy: automatic
            if (config.bumpStrategy === "automatic") {
                // Get commits since last tag
                const git = new GitService();
                const lastTagResult = await git.getLatestTag();

                if (lastTagResult.isErr()) {
                    logger.error("Failed to get latest tag:", lastTagResult.error.message);
                    return lastTagResult;
                }

                const lastTag = lastTagResult.value || "HEAD";
                const commitsResult = await git.getCommitsSince(lastTag);

                if (commitsResult.isErr()) {
                    logger.error("Failed to get commits:", commitsResult.error.message);
                    return commitsResult;
                }

                // Parse commits
                const ccService = new ConventionalCommitService();
                const parsedCommits = commitsResult.value
                    .map((commit) => ccService.parse(commit.message))
                    .filter((result) => result.isOk())
                    .map((result) => result.value);

                if (parsedCommits.length === 0) {
                    logger.warn("No conventional commits found, defaulting to patch bump");
                }

                const bumpType = versionService.determineBumpType(parsedCommits);
                const nextVersionResult = versionService.bump(currentVersion, bumpType);

                if (nextVersionResult.isErr()) {
                    logger.error("Failed to bump version:", nextVersionResult.error.message);
                    return nextVersionResult;
                }

                const nextVersion = versionService.format(nextVersionResult.value);
                logger.info(`Next version (automatic ${bumpType}): ${nextVersion}`);

                return okAsync(
                    ctx.forkMultiple({
                        nextVersion,
                        bumpType,
                        commits: parsedCommits,
                    }),
                );
            }

            // Strategy: prompt
            if (config.bumpStrategy === "prompt") {
                const suggestionsResult = versionService.getSuggestions(currentVersion);

                if (suggestionsResult.isErr()) {
                    logger.error("Failed to generate suggestions:", suggestionsResult.error.message);
                    return suggestionsResult;
                }

                const prompts = new PromptService();
                const versionResult = await prompts.selectVersion({
                    currentVersion,
                    suggestedVersions: suggestionsResult.value,
                    custom: true,
                });

                if (versionResult.isErr()) {
                    logger.error("Failed to prompt for version:", versionResult.error.message);
                    return versionResult;
                }

                logger.info(`Selected version: ${versionResult.value}`);
                return okAsync(ctx.fork("nextVersion", versionResult.value));
            }

            // Strategy: manual (with releaseType)
            if (config.releaseType) {
                const nextVersionResult = versionService.bump(currentVersion, config.releaseType);

                if (nextVersionResult.isErr()) {
                    logger.error("Failed to bump version:", nextVersionResult.error.message);
                    return nextVersionResult;
                }

                const nextVersion = versionService.format(nextVersionResult.value);
                logger.info(`Next version (${config.releaseType}): ${nextVersion}`);

                return okAsync(ctx.fork("nextVersion", nextVersion));
            }

            logger.warn("No bump strategy determined, skipping version calculation");
            return okAsync(ctx);
        })
        .build();
}

/**
 * Set manual version if provided.
 * Runtime skip: Skipped if bump strategy is not "manual" or manual version not provided.
 */
export function createSetManualVersionTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("set-manual-version")
        .description("Use manually provided version")
        .dependsOn("init-version")
        .skipWhen((ctx) => {
            const config = ctx.config as ReleaseConfig;
            return config.bumpStrategy !== "manual" || !config.manualVersion;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const config = ctx.config as ReleaseConfig;
            const versionService = new VersionService();

            // Validate manual version
            const validateResult = versionService.validate(config.manualVersion!);

            if (validateResult.isErr()) {
                logger.error("Invalid manual version:", validateResult.error.message);
                return validateResult;
            }

            logger.info(`Using manual version: ${config.manualVersion}`);
            return okAsync(ctx.fork("nextVersion", config.manualVersion));
        })
        .build();
}

/**
 * Update version in package.json and other files.
 */
export function createUpdateVersionTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("update-version")
        .description("Update version in package.json")
        .dependsOn("calculate-version", "set-manual-version")
        .skipWhen((ctx) => !ctx.has("nextVersion"))
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const nextVersion = ctx.data.nextVersion as string;

            if (!nextVersion) {
                logger.error("Next version not found in context");
                return okAsync(ctx);
            }

            const fs = new FileSystemService();
            const result = await fs.updatePackageJsonVersion(nextVersion);

            if (result.isErr()) {
                logger.error("Failed to update package.json:", result.error.message);
                return result;
            }

            logger.info(`✓ Updated package.json to version ${nextVersion}`);
            return okAsync(ctx.fork("versionUpdated", true));
        })
        .withUndo(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const currentVersion = ctx.data.currentVersion as string;

            if (currentVersion) {
                const fs = new FileSystemService();
                await fs.updatePackageJsonVersion(currentVersion);
                logger.warn(`⟲ Rolled back version to ${currentVersion}`);
            }

            return okAsync();
        })
        .build();
}
