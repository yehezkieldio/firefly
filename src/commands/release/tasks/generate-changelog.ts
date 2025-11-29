/**
 * Generate Changelog Task
 *
 * Generates or updates the changelog file based on commits
 * since the last release using git-cliff.
 *
 * @module commands/release/tasks/generate-changelog
 */

import { colors } from "consola/utils";
import { okAsync } from "neverthrow";
import type { ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import { type ChangelogOptions, extractChangesSection, generateChangelog } from "#/services/git-cliff-service";
import type { ResolvedServices } from "#/services/service-registry";
import { resolveTemplateString } from "#/services/template-service";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import {
    type FireflyAsyncResult,
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    type FireflyResult,
    validationErr,
} from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHANGELOG_PATH = "CHANGELOG.md";
const DEFAULT_CONFIG_PATH = "./cliff.toml";

/** Regex for extracting owner/repo from GitHub HTTPS URLs */
const HTTPS_REPO_REGEX = /github\.com[/:]([^/]+)\/([^/.]+)/;
/** Regex for extracting owner/repo from GitHub SSH URLs */
const SSH_REPO_REGEX = /git@github\.com:([^/]+)\/([^/.]+)/;

// ============================================================================
// Repository Resolution
// ============================================================================

/**
 * Resolves the GitHub repository in "owner/repo" format.
 *
 * Order of precedence:
 * 1. Explicit repository in config
 * 2. Extracted from git remote URL
 */
function resolveRepository(ctx: ReleaseContext): FireflyAsyncResult<string> {
    // Check if explicitly configured
    const configRepo = ctx.config.name && ctx.config.scope ? `${ctx.config.scope}/${ctx.config.name}` : undefined;

    if (configRepo) {
        logger.verbose(`[generate-changelog] Using repository from config: ${configRepo}`);
        return FireflyOkAsync(configRepo);
    }

    // Fall back to git remote URL
    return ctx.services.git.getRemoteUrl().andThen((url) => {
        const extracted = extractRepositoryFromUrl(url);
        if (extracted) {
            logger.verbose(`[generate-changelog] Extracted repository: ${extracted}`);
            return FireflyOkAsync(extracted);
        }

        return FireflyErrAsync({
            code: "VALIDATION",
            message: "Could not determine GitHub repository from remote URL",
            source: "generate-changelog",
        });
    });
}

/**
 * Extracts "owner/repo" from a git remote URL.
 * Supports both HTTPS and SSH formats.
 */
function extractRepositoryFromUrl(url: string): string | null {
    // HTTPS: https://github.com/owner/repo.git
    const httpsMatch = HTTPS_REPO_REGEX.exec(url);
    if (httpsMatch) {
        return `${httpsMatch[1]}/${httpsMatch[2]}`;
    }

    // SSH: git@github.com:owner/repo.git
    const sshMatch = SSH_REPO_REGEX.exec(url);
    if (sshMatch) {
        return `${sshMatch[1]}/${sshMatch[2]}`;
    }

    return null;
}

// ============================================================================
// Changelog Options Builder
// ============================================================================

/**
 * Builds changelog generation options from context.
 */
function buildChangelogOptions(ctx: ReleaseContext, repository: string): FireflyResult<ChangelogOptions> {
    const nextVersion = ctx.data.nextVersion;
    if (!nextVersion) {
        return validationErr({
            message: "Next version not found in context. Ensure bump task ran first.",
            source: "generate-changelog",
        });
    }

    // Resolve tag name template
    const tagName = resolveTemplateString(ctx.config.tagName, {
        version: nextVersion,
        name: ctx.config.name,
        scope: ctx.config.scope,
    });

    const options: ChangelogOptions = {
        tagName,
        dryRun: ctx.data.dryRun,
        changelogPath: ctx.config.changelogPath || DEFAULT_CHANGELOG_PATH,
        repository,
        configPath: DEFAULT_CONFIG_PATH,
        releaseNotes: ctx.config.releaseNotes?.trim() || undefined,
    };

    return FireflyOk(options);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensures the changelog file exists, creating an empty one if needed.
 */
function ensureChangelogFileExists(ctx: ReleaseContext, changelogPath: string): FireflyAsyncResult<void> {
    return ctx.services.fs.exists(changelogPath).andThen((exists) => {
        if (exists) {
            logger.verbose(`[generate-changelog] Changelog file exists: ${changelogPath}`);
            return okAsync(undefined);
        }

        logger.verbose(`[generate-changelog] Creating changelog file: ${changelogPath}`);
        return ctx.services.fs.write(changelogPath, "", { dryRun: ctx.data.dryRun });
    });
}

/**
 * Executes the changelog generation and returns updated context.
 */
function executeChangelogGeneration(ctx: ReleaseContext, startTime: number): FireflyAsyncResult<ReleaseContext> {
    const changelogPath = ctx.config.changelogPath || DEFAULT_CHANGELOG_PATH;

    return ensureChangelogFileExists(ctx, changelogPath).andThen(() =>
        resolveRepository(ctx).andThen((repository) => {
            const optionsResult = buildChangelogOptions(ctx, repository);
            if (optionsResult.isErr()) {
                return FireflyErrAsync(optionsResult.error);
            }

            return generateChangelog(optionsResult.value).andThen((result) => {
                const elapsed = Date.now() - startTime;
                logger.success(`[generate-changelog] Generation complete in ${colors.greenBright(`${elapsed}ms`)}`);

                // Extract changes section for GitHub release notes
                const changesSection = extractChangesSection(result.content);

                // Debug logging
                if (process.env.FIREFLY_DEBUG_SHOW_CHANGELOG_CONTENT) {
                    logger.verbose(`[generate-changelog] Generated content:\n${result.content}\n`);
                }

                return FireflyOkAsync(ctx.fork("changelogContent", changesSection || result.content));
            });
        })
    );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates the Generate Changelog Task.
 *
 * This task generates or updates the changelog file based on
 * commits since the last release using git-cliff.
 *
 * Features:
 * - Uses git-cliff for changelog generation
 * - Supports custom tag name templates
 * - Integrates GitHub token for commit links
 * - Stores generated content in context for GitHub release notes
 *
 * Skipped when: skipChangelog is enabled, or both skipBump and skipGit are enabled
 * Dependencies: bump-version (needs the next version)
 */
export function createGenerateChangelogTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("generate-changelog")
        .description("Generates or updates the changelog file")
        .dependsOn("bump-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipChangelog || (ctx.config.skipBump && ctx.config.skipGit),
            "Skipped: skipChangelog is enabled, or both skipBump and skipGit are enabled"
        )
        .execute((ctx) => {
            logger.info("[generate-changelog] Generating changelog...");
            return executeChangelogGeneration(ctx, Date.now());
        })
        .withUndo((ctx) => {
            logger.verbose("[generate-changelog] Undoing changelog generation");
            const changelogPath = ctx.config.changelogPath || DEFAULT_CHANGELOG_PATH;

            // Restore changelog file by staging it (minimal undo)
            return ctx.services.git.add(changelogPath).andThen(() => {
                logger.verbose(`[generate-changelog] Would restore ${changelogPath} to HEAD`);
                return okAsync(undefined);
            });
        })
        .build();
}
