import type { ReleaseContext } from "#/commands/release/release.context";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL } from "#/domain/semver/semver.strategies";

export const releaseSkipPredicates = {
    /**
     * Skip when version bumping is disabled
     */
    skipBump: (ctx: ReleaseContext) => ctx.config.skipBump,

    /**
     * Skip when changelog generation is disabled
     */
    skipChangelog: (ctx: ReleaseContext) => ctx.config.skipChangelog,

    /**
     * Skip when all git operations are disabled
     */
    skipGit: (ctx: ReleaseContext) => ctx.config.skipGit,

    /**
     * Skip when push operations are disabled
     */
    skipPush: (ctx: ReleaseContext) => ctx.config.skipPush,

    /**
     * Skip when GitHub release is disabled
     */
    skipGitHubRelease: (ctx: ReleaseContext) => ctx.config.skipGitHubRelease,

    /**
     * Skip when both bump and changelog are disabled (no changes to commit)
     */
    skipBumpAndChangelog: (ctx: ReleaseContext) => ctx.config.skipBump && ctx.config.skipChangelog,

    /**
     * Skip when both bump and git are disabled (changelog-only mode without git)
     */
    skipBumpAndGit: (ctx: ReleaseContext) => ctx.config.skipBump && ctx.config.skipGit,

    /**
     * Skip when git is disabled or there are no changes to commit
     */
    skipGitOrNoChanges: (ctx: ReleaseContext) =>
        ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),

    /**
     * Skip when push is disabled or there are no changes to push
     */
    skipPushOrNoChanges: (ctx: ReleaseContext) =>
        ctx.config.skipGit || ctx.config.skipPush || (ctx.config.skipBump && ctx.config.skipChangelog),

    /**
     * Skip when GitHub release is disabled or there's no tag to release
     */
    skipGitHubReleaseOrNoTag: (ctx: ReleaseContext) =>
        ctx.config.skipGitHubRelease || ctx.config.skipGit || (ctx.config.skipBump && ctx.config.skipChangelog),

    /**
     * Skip when bump strategy is 'auto'
     */
    bumpStrategyIsAuto: (ctx: ReleaseContext) => ctx.config.bumpStrategy === BUMP_STRATEGY_AUTO,

    /**
     * Skip when bump strategy is 'manual'
     */
    bumpStrategyIsManual: (ctx: ReleaseContext) => ctx.config.bumpStrategy === BUMP_STRATEGY_MANUAL,

    /**
     * Skip when release type is already specified
     */
    hasReleaseType: (ctx: ReleaseContext) => Boolean(ctx.config.releaseType),

    /**
     * Skip when bump strategy is already specified
     */
    hasBumpStrategy: (ctx: ReleaseContext) => Boolean(ctx.config.bumpStrategy),
} as const;
