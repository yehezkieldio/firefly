/**
 * Automatic Bump Task
 *
 * Automatically determines the version bump based on commit messages
 * using conventional commits analysis. Analyzes commits since the last
 * tag and recommends a version bump (major, minor, patch) based on
 * conventional commit conventions.
 *
 * @module commands/release/tasks/automatic-bump
 */

import { colors } from "consola/utils";
import { BUMP_STRATEGY_AUTO, type ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import { getCommitsSinceLastTag, hasAnyTags } from "#/semver/commit-history";
import type { VersionRecommendation } from "#/semver/semantic-analyzer";
import { analyzeCommits, createDefaultRecommendation } from "#/semver/semantic-analyzer";
import { Version } from "#/semver/version";
import { resolveNextVersion, type VersionDecisionOptions } from "#/semver/version-resolver";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";
import { FireflyErrAsync, FireflyOkAsync } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the semantic version analysis.
 * Can be extended in the future to allow user customization.
 */
interface SemanticAnalysisConfig {
    /** Whether to include all commits when no tags exist */
    readonly includeAllCommitsWhenNoTags: boolean;
}

const DEFAULT_ANALYSIS_CONFIG: SemanticAnalysisConfig = {
    includeAllCommitsWhenNoTags: false,
} as const;

// ============================================================================
// Analysis Logic
// ============================================================================

/**
 * Gets the relevant commits for version analysis.
 * Returns commits since last tag, or empty array if no tags exist
 * (unless configured to include all commits).
 */
function getRelevantCommits(
    config: SemanticAnalysisConfig,
    cwd?: string
): FireflyAsyncResult<ReturnType<typeof getCommitsSinceLastTag> extends FireflyAsyncResult<infer T> ? T : never> {
    return hasAnyTags(cwd).andThen((hasTags) => {
        if (!hasTags) {
            logger.verbose("[automatic-bump] No tags found in repository");

            if (config.includeAllCommitsWhenNoTags) {
                logger.verbose("[automatic-bump] Configuration set to include all commits when no tags exist");
                return getCommitsSinceLastTag(cwd);
            }

            logger.verbose("[automatic-bump] Returning empty commits (no tags exist)");
            return FireflyOkAsync([]);
        }

        logger.verbose("[automatic-bump] Retrieving commits since last tag");
        return getCommitsSinceLastTag(cwd);
    });
}

/**
 * Performs semantic analysis on commits and returns a version recommendation.
 */
function performSemanticAnalysis(cwd?: string): FireflyAsyncResult<VersionRecommendation> {
    logger.verbose("[automatic-bump] Starting semantic version analysis...");
    const startTime = Date.now();

    return getRelevantCommits(DEFAULT_ANALYSIS_CONFIG, cwd).andThen((commits) => {
        logger.verbose(`[automatic-bump] Analyzing ${commits.length} commits for version recommendation`);

        if (commits.length === 0) {
            logger.verbose("[automatic-bump] No commits found, returning default patch recommendation");
            return FireflyOkAsync(createDefaultRecommendation());
        }

        const analysisResult = analyzeCommits(commits);
        if (analysisResult.isErr()) {
            return FireflyErrAsync(analysisResult.error);
        }

        const recommendation = analysisResult.value;
        const duration = Date.now() - startTime;

        logger.verbose(
            `[automatic-bump] Analysis completed in ${duration}ms. ` +
                `Recommendation: ${recommendation.releaseType} (level ${recommendation.level})`
        );

        return FireflyOkAsync(recommendation);
    });
}

/**
 * Logs the analysis reason in a user-friendly format.
 */
function logAnalysisReason(reason: string): void {
    if (reason.startsWith("Analysis found:")) {
        const prefix = "Analysis found:";
        const details = reason.slice(prefix.length).trim();
        logger.info(`${prefix} ${colors.bold(details)}`);
    } else {
        logger.info(reason);
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates the Automatic Bump Task.
 *
 * This task:
 * 1. Retrieves commits since the last git tag
 * 2. Analyzes them using conventional commit conventions
 * 3. Determines the appropriate version bump (major/minor/patch)
 * 4. Sets the next version in the workflow context
 *
 * Breaking changes → major bump
 * New features (feat) → minor bump
 * Bug fixes and other changes → patch bump
 *
 * Executes when: bumpStrategy === "auto"
 */
export function createAutomaticBumpTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("automatic-bump")
        .description("Automatically determines version bump from commit messages")
        .dependsOn("execute-bump-strategy")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || ctx.config.bumpStrategy !== BUMP_STRATEGY_AUTO,
            "Skipped: skipBump enabled or bumpStrategy is not 'auto'"
        )
        .execute((ctx) => {
            logger.info("[automatic-bump] Analyzing commits for automatic version bump...");

            // Get current version from context
            const currentVersionRaw = ctx.data.currentVersion;
            if (!currentVersionRaw) {
                return FireflyErrAsync({
                    code: "VALIDATION",
                    message: "Current version not found in context. Ensure initialize-version task ran first.",
                });
            }

            // Parse current version
            const currentVersionResult = Version.from(currentVersionRaw);
            if (currentVersionResult.isErr()) {
                return FireflyErrAsync(currentVersionResult.error);
            }

            const currentVersion = currentVersionResult.value;

            // Perform semantic analysis
            return performSemanticAnalysis().andThen((recommendation) => {
                // Log the analysis reason
                logAnalysisReason(recommendation.reason);

                // Build version decision options
                const options: VersionDecisionOptions = {
                    currentVersion,
                    releaseType: ctx.config.releaseType,
                    prereleaseIdentifier: ctx.config.preReleaseId,
                    prereleaseBase: ctx.config.preReleaseBase,
                };

                // Resolve the next version
                const nextVersionResult = resolveNextVersion(options, recommendation);
                if (nextVersionResult.isErr()) {
                    return FireflyErrAsync(nextVersionResult.error);
                }

                const nextVersion = nextVersionResult.value;
                logger.verbose(`[automatic-bump] Version bump: '${currentVersion.raw}' → '${nextVersion.raw}'`);
                logger.info(`[automatic-bump] Next version: ${colors.cyan(nextVersion.raw)}`);

                // Update context with the next version
                return FireflyOkAsync(ctx.fork("nextVersion", nextVersion.raw));
            });
        })
        .build();
}
