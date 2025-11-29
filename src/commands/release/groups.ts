/**
 * Release Command Task Groups
 *
 * Organizes release tasks into logical groups with shared skip conditions.
 * Each group handles a specific phase of the release workflow.
 *
 * @module commands/release/groups
 */

import { Result } from "neverthrow";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL, type ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import { createAutomaticBumpTask } from "#/commands/release/tasks/automatic-bump";
import { createBumpVersionTask } from "#/commands/release/tasks/bump-version";
import { createCommitChangesTask } from "#/commands/release/tasks/commit-changes";
import { createCreateTagTask } from "#/commands/release/tasks/create-tag";
import { createExecuteBumpStrategyTask } from "#/commands/release/tasks/execute-bump-strategy";
import { createGenerateChangelogTask } from "#/commands/release/tasks/generate-changelog";
import { createInitializeVersionTask } from "#/commands/release/tasks/initialize-version";
import { createReleasePreflightTask } from "#/commands/release/tasks/preflight";
import { createPrepareConfigTask } from "#/commands/release/tasks/prepare-config";
import { createPromptBumpStrategyTask } from "#/commands/release/tasks/prompt-bump";
import { createPromptManualVersionTask } from "#/commands/release/tasks/prompt-manual-version";
import { createPublishGitHubReleaseTask } from "#/commands/release/tasks/publish-github-release";
import { createPushCommitTask } from "#/commands/release/tasks/push-commit";
import { createPushTagTask } from "#/commands/release/tasks/push-tag";
import { createStageChangesTask } from "#/commands/release/tasks/stage-changes";
import { createStraightBumpTask } from "#/commands/release/tasks/straight-bump";
import type { WorkflowContext } from "#/context/workflow-context";
import type { TaskGroup } from "#/task-system/task-group";
import { buildTaskGroup } from "#/task-system/task-group-builder";
import type { FireflyResult } from "#/utils/result";

// Type alias for release context
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, unknown>;

// ============================================================================
// Skip Predicates
// ============================================================================

/**
 * Common skip predicates for release tasks.
 * These are reusable predicates that can be combined for group-level skip conditions.
 */
const skipPredicates = {
    /** Skip when version bumping is disabled */
    skipBump: (ctx: ReleaseContext) => ctx.config.skipBump,

    /** Skip when changelog generation is disabled */
    skipChangelog: (ctx: ReleaseContext) => ctx.config.skipChangelog,

    /** Skip when all git operations are disabled */
    skipGit: (ctx: ReleaseContext) => ctx.config.skipGit,

    /** Skip when push operations are disabled */
    skipPush: (ctx: ReleaseContext) => ctx.config.skipPush,

    /** Skip when GitHub release is disabled */
    skipGitHubRelease: (ctx: ReleaseContext) => ctx.config.skipGitHubRelease,

    /** Skip when both bump and changelog are disabled (no changes to commit) */
    skipBumpAndChangelog: (ctx: ReleaseContext) => ctx.config.skipBump && ctx.config.skipChangelog,

    /** Skip when both bump and git are disabled (changelog-only mode without git) */
    skipBumpAndGit: (ctx: ReleaseContext) => ctx.config.skipBump && ctx.config.skipGit,

    /** Skip when git is disabled or there are no changes to commit */
    skipGitOrNoChanges: (ctx: ReleaseContext) =>
        ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),

    /** Skip when push is disabled or there are no changes to push */
    skipPushOrNoChanges: (ctx: ReleaseContext) =>
        ctx.config.skipGit || ctx.config.skipPush || (ctx.config.skipBump && ctx.config.skipChangelog),

    /** Skip when GitHub release is disabled or there's no tag to release */
    skipGitHubReleaseOrNoTag: (ctx: ReleaseContext) =>
        ctx.config.skipGitHubRelease || ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),

    /** Skip when bump strategy is 'auto' */
    bumpStrategyIsAuto: (ctx: ReleaseContext) => ctx.config.bumpStrategy === BUMP_STRATEGY_AUTO,

    /** Skip when bump strategy is 'manual' */
    bumpStrategyIsManual: (ctx: ReleaseContext) => ctx.config.bumpStrategy === BUMP_STRATEGY_MANUAL,

    /** Skip when release type is already specified */
    hasReleaseType: (ctx: ReleaseContext) => Boolean(ctx.config.releaseType),

    /** Skip when bump strategy is already specified */
    hasBumpStrategy: (ctx: ReleaseContext) => Boolean(ctx.config.bumpStrategy),
} as const;

// ============================================================================
// Setup Group
// ============================================================================

/**
 * Creates the setup group containing preflight, config preparation, and version initialization.
 *
 * This group runs first and has no skip condition at the group level.
 * Individual tasks have their own skip conditions (preflight can be skipped via config).
 */
export function createSetupGroup(skipPreflight: boolean): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [
        createReleasePreflightTask(() => skipPreflight),
        createPrepareConfigTask(),
        createInitializeVersionTask(),
    ];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("setup")
        .description("Setup and initialization tasks")
        .tasks(combined.value)
        .build();
}

// ============================================================================
// Bump Strategy Group
// ============================================================================

/**
 * Creates the bump strategy group containing version bump decision tasks.
 *
 * This group handles determining the version bump strategy (auto/manual)
 * and the specific release type. It is skipped when skipBump is enabled.
 *
 * Tasks in this group have complex branching logic:
 * - straight-bump: Used when releaseType is pre-specified
 * - prompt-bump-strategy: Prompts user when no strategy is specified
 * - execute-bump-strategy: Executes the chosen strategy
 * - automatic-bump: Determines version from commit history
 * - prompt-manual-version: Prompts user for manual version selection
 */
export function createBumpStrategyGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [
        createStraightBumpTask(),
        createPromptBumpStrategyTask(),
        createExecuteBumpStrategyTask(),
        createAutomaticBumpTask(),
        createPromptManualVersionTask(),
    ];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("bump-strategy")
        .description("Version bump strategy selection")
        .dependsOnGroup("setup")
        .skipWhen(skipPredicates.skipBump)
        .skipReason("Skipped: skipBump is enabled")
        .tasks(combined.value)
        .build();
}

// ============================================================================
// Bump Execution Group
// ============================================================================

/**
 * Creates the bump execution group containing the actual version bump task.
 *
 * This group executes the version bump in package.json after the strategy
 * has been determined. It is skipped when skipBump is enabled.
 */
export function createBumpExecutionGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResult = createBumpVersionTask();
    if (taskResult.isErr()) {
        return taskResult.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("bump-execution")
        .description("Version bump execution")
        .dependsOnGroup("bump-strategy")
        .skipWhen(skipPredicates.skipBump)
        .skipReason("Skipped: skipBump is enabled")
        .tasks([taskResult.value])
        .build();
}

// ============================================================================
// Changelog Group
// ============================================================================

/**
 * Creates the changelog group containing changelog generation.
 *
 * This group generates the changelog based on commit history.
 * It is skipped when skipChangelog is enabled or when both skipBump and skipGit are enabled.
 */
export function createChangelogGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResult = createGenerateChangelogTask();
    if (taskResult.isErr()) {
        return taskResult.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("changelog")
        .description("Changelog generation")
        .dependsOnGroup("bump-execution")
        .skipWhen((ctx) => ctx.config.skipChangelog || skipPredicates.skipBumpAndGit(ctx))
        .skipReason("Skipped: skipChangelog is enabled, or both skipBump and skipGit are enabled")
        .tasks([taskResult.value])
        .build();
}

// ============================================================================
// Git Commit Group
// ============================================================================

/**
 * Creates the git commit group containing staging, committing, and tagging.
 *
 * This group handles creating the release commit and tag.
 * It is skipped when skipGit is enabled or when there are no changes to commit.
 */
export function createGitCommitGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [createStageChangesTask(), createCommitChangesTask(), createCreateTagTask()];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("git-commit")
        .description("Git commit and tag operations")
        .dependsOnGroup("changelog")
        .skipWhen(skipPredicates.skipGitOrNoChanges)
        .skipReason("Skipped: skipGit is enabled, or both skipBump and skipChangelog are enabled")
        .tasks(combined.value)
        .build();
}

// ============================================================================
// Git Push Group
// ============================================================================

/**
 * Creates the git push group containing push operations.
 *
 * This group pushes the commit and tag to the remote repository.
 * It is skipped when skipGit, skipPush, or when there are no changes to push.
 */
export function createGitPushGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResults = [createPushCommitTask(), createPushTagTask()];

    const combined = Result.combine(taskResults);
    if (combined.isErr()) {
        return combined.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("git-push")
        .description("Git push operations")
        .dependsOnGroup("git-commit")
        .skipWhen(skipPredicates.skipPushOrNoChanges)
        .skipReason("Skipped: skipGit, skipPush, or both skipBump and skipChangelog are enabled")
        .tasks(combined.value)
        .build();
}

// ============================================================================
// GitHub Release Group
// ============================================================================

/**
 * Creates the GitHub release group containing the release publication task.
 *
 * This group publishes a GitHub release based on the created tag.
 * It is skipped when skipGitHubRelease, skipGit, or when there's no tag to release.
 */
export function createGitHubReleaseGroup(): FireflyResult<TaskGroup<ReleaseContext>> {
    const taskResult = createPublishGitHubReleaseTask();
    if (taskResult.isErr()) {
        return taskResult.map(() => ({}) as TaskGroup<ReleaseContext>);
    }

    return buildTaskGroup<ReleaseContext>("github-release")
        .description("GitHub release publication")
        .dependsOnGroup("git-push")
        .skipWhen(skipPredicates.skipGitHubReleaseOrNoTag)
        .skipReason("Skipped: skipGitHubRelease, skipGit, or both skipBump and skipChangelog are enabled")
        .tasks([taskResult.value])
        .build();
}

// ============================================================================
// All Groups Factory
// ============================================================================

/**
 * Creates all release task groups in the correct order.
 *
 * @param skipPreflight - Whether to skip the preflight check
 * @returns Array of task groups or an error
 */
export function createReleaseGroups(skipPreflight: boolean): FireflyResult<TaskGroup<ReleaseContext>[]> {
    const groupResults = [
        createSetupGroup(skipPreflight),
        createBumpStrategyGroup(),
        createBumpExecutionGroup(),
        createChangelogGroup(),
        createGitCommitGroup(),
        createGitPushGroup(),
        createGitHubReleaseGroup(),
    ];

    return Result.combine(groupResults);
}
