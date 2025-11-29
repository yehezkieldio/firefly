/**
 * Publish GitHub Release Task
 *
 * Creates a GitHub release with the changelog content using the GitHub CLI.
 * Supports draft releases, pre-releases, and latest release marking.
 *
 * @module commands/release/tasks/publish-github-release
 */

import { colors } from "consola/utils";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { resolveTemplateString } from "#/services/template-service";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { executeGhCommand } from "#/utils/gh-command-executor";
import { logger } from "#/utils/log";
import { type FireflyAsyncResult, FireflyOkAsync, type FireflyResult, notFoundErrAsync } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

/** Options for creating a GitHub release */
interface CreateReleaseOptions {
    /** Tag name for the release (e.g., "v1.0.0" or "@scope/pkg@1.0.0") */
    readonly tag: string;
    /** Release title displayed on GitHub */
    readonly title: string;
    /** Release notes content (changelog body) */
    readonly notes: string;
    /** Mark as the latest release */
    readonly latest: boolean;
    /** Create as a draft release */
    readonly draft: boolean;
    /** Mark as a pre-release */
    readonly prerelease: boolean;
    /** Simulate the operation without making changes */
    readonly dryRun?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolves the tag name using template placeholders.
 *
 * @param ctx - Workflow context
 * @returns Resolved tag name
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
 * Resolves the release title using template placeholders.
 *
 * @param ctx - Workflow context
 * @returns Resolved release title
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
 * Extracts the release notes from the changelog content.
 *
 * Strips the changelog header (everything before the first "###" section)
 * to get only the changes for this release.
 *
 * @param changelogContent - Raw changelog content
 * @returns Processed release notes or empty string
 */
function extractReleaseNotes(changelogContent: string | undefined): string {
    if (!changelogContent?.trim()) {
        return "";
    }

    // Find the start of the actual changes (first ### heading)
    const changesStartIndex = changelogContent.indexOf("###");
    if (changesStartIndex === -1) {
        logger.verbose("[publish-github-release] No commit sections found in changelog");
        return "";
    }

    const extracted = changelogContent.slice(changesStartIndex).trim();

    // Verify there's actual content
    if (!extracted.includes("###")) {
        logger.verbose("[publish-github-release] No valid commit entries in changelog");
        return "";
    }

    return extracted;
}

/**
 * Formats the release status flags for logging.
 *
 * @param config - Release configuration
 * @returns Human-readable status string
 */
function formatReleaseStatus(config: ReleaseConfig): string {
    const statusParts = [
        config.releaseDraft ? "draft" : null,
        config.releasePreRelease ? "pre-release" : null,
        config.releaseLatest ? "latest" : null,
    ].filter((status): status is string => status !== null);

    return statusParts.length > 0 ? statusParts.join(", ") : "normal";
}

/**
 * Builds the GitHub CLI arguments for creating a release.
 *
 * @param options - Release options
 * @returns Array of CLI arguments
 */
function buildReleaseArgs(options: CreateReleaseOptions): string[] {
    const args = ["release", "create", options.tag, "--title", options.title];

    if (options.latest) {
        args.push("--latest");
    }

    if (options.draft) {
        args.push("--draft");
    }

    if (options.prerelease) {
        args.push("--prerelease");
    }

    if (options.notes.trim()) {
        args.push("--notes", options.notes);
    }

    return args;
}

/**
 * Creates a GitHub release using the GitHub CLI.
 *
 * @param options - Release creation options
 * @returns Async result indicating success or failure
 */
function createGitHubRelease(options: CreateReleaseOptions): FireflyAsyncResult<void> {
    const args = buildReleaseArgs(options);

    return executeGhCommand(args, { dryRun: options.dryRun }).andThen((output) => {
        if (output.startsWith("Dry run:")) {
            logger.verbose(`[publish-github-release] ${output}`);
        }
        return FireflyOkAsync(undefined);
    });
}

/**
 * Deletes a GitHub release by tag name.
 * Used for undo operations to roll back release creation.
 *
 * @param tagName - Tag name of the release to delete
 * @param dryRun - Whether to simulate the operation
 * @returns Async result indicating success or failure
 */
function deleteGitHubRelease(tagName: string, dryRun?: boolean): FireflyAsyncResult<void> {
    const args = ["release", "delete", tagName, "--yes"];

    return executeGhCommand(args, { dryRun }).andThen((output) => {
        if (output.startsWith("Dry run:")) {
            logger.verbose(`[publish-github-release] ${output}`);
        }
        return FireflyOkAsync(undefined);
    });
}

/**
 * Executes the publish GitHub release operation.
 *
 * @param ctx - Workflow context
 * @returns Updated context after creating the release
 */
function executePublishRelease(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const { config, data } = ctx;

    if (!data.nextVersion) {
        return notFoundErrAsync({
            message: "No next version found in context. Ensure bump task has run.",
            source: "publish-github-release.execute",
        });
    }

    const tagName = resolveTagName(ctx);
    const releaseTitle = resolveReleaseTitle(ctx);
    const releaseNotes = extractReleaseNotes(data.changelogContent);
    const releaseStatus = formatReleaseStatus(config);

    logger.info(`[publish-github-release] Publishing ${colors.gray(releaseStatus)} GitHub release...`);
    logger.verbose(`[publish-github-release] Tag: ${colors.gray(tagName)}`);
    logger.verbose(`[publish-github-release] Title: ${colors.gray(releaseTitle)}`);

    if (!releaseNotes) {
        logger.warn("[publish-github-release] No changelog content available. Proceeding with empty release notes.");
    }

    const releaseOptions: CreateReleaseOptions = {
        tag: tagName,
        title: releaseTitle,
        notes: releaseNotes,
        latest: config.releaseLatest,
        draft: config.releaseDraft,
        prerelease: config.releasePreRelease,
        dryRun: data.dryRun,
    };

    return createGitHubRelease(releaseOptions).andThen(() => {
        logger.success(
            `[publish-github-release] Published GitHub release ${colors.cyan(releaseTitle)} (tag: ${colors.cyan(tagName)})`
        );
        return FireflyOkAsync(ctx);
    });
}

// ============================================================================
// Task Factory
// ============================================================================

/**
 * Creates the Publish GitHub Release Task.
 *
 * This task creates a GitHub release using the GitHub CLI (`gh release create`).
 * It uses the changelog content as release notes and supports various release
 * modes (draft, pre-release, latest).
 *
 * **Dependencies:** push-tag (ensures tag exists on remote before creating release)
 *
 * **Skipped when:**
 * - skipGitHubRelease is enabled
 * - skipGit is enabled (no tag to release)
 * - Both skipBump and skipChangelog are enabled (nothing to release)
 *
 * **Undo:** Deletes the GitHub release using `gh release delete <tag>`
 *
 * **Configuration options used:**
 * - releaseTitle: Template for the release title
 * - tagName: Template for the tag name
 * - releaseLatest: Mark as latest release
 * - releaseDraft: Create as draft
 * - releasePreRelease: Mark as pre-release
 *
 * @returns Result containing the task or an error
 */
export function createPublishGitHubReleaseTask(): FireflyResult<Task> {
    /** Captured for undo operation */
    let capturedTagName: string | undefined;

    return TaskBuilder.create<ReleaseContext>("publish-github-release")
        .description("Creates a GitHub release with changelog content")
        .dependsOn("push-tag")
        .skipWhenWithReason(
            (ctx) =>
                ctx.config.skipGitHubRelease || ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),
            "Skipped: skipGitHubRelease, skipGit, or both skipBump and skipChangelog are enabled"
        )
        .execute((ctx) => {
            // Capture tag name for potential undo
            capturedTagName = resolveTagName(ctx);

            return executePublishRelease(ctx);
        })
        .withUndo((ctx) => {
            if (capturedTagName === undefined) {
                logger.verbose("[publish-github-release] No tag name captured, skipping undo");
                return FireflyOkAsync(undefined);
            }

            const tagName = capturedTagName;

            logger.verbose(`[publish-github-release] Undoing: deleting GitHub release for tag ${tagName}...`);

            return deleteGitHubRelease(tagName, ctx.data.dryRun).andThen(() => {
                logger.verbose(`[publish-github-release] Undo complete: GitHub release for tag ${tagName} deleted`);
                return FireflyOkAsync(undefined);
            });
        })
        .build();
}
