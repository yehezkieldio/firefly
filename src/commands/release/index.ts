import { errAsync, okAsync, Result } from "neverthrow";
import { createCommand } from "#/command-registry/command-types";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/config";
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

const RELEASE_SERVICES = ["fs", "git"] as const;

export const releaseCommand = createCommand<ReleaseConfig, ReleaseData, typeof RELEASE_SERVICES>({
    meta: {
        name: "release",
        description: "Automated semantic versioning, changelog generation, and GitHub release creation",
        configSchema: ReleaseConfigSchema,
        requiredServices: RELEASE_SERVICES,
    },

    buildTasks(context) {
        const taskResults = [
            // Preflight and setup
            createReleasePreflightTask(() => context.config.skipPreflightCheck === true),
            createPrepareConfigTask(),
            createInitializeVersionTask(),

            // Version bump strategy branching
            createStraightBumpTask(),
            createPromptBumpStrategyTask(),
            createExecuteBumpStrategyTask(),
            createAutomaticBumpTask(),
            createPromptManualVersionTask(),

            // Version bump execution
            createBumpVersionTask(),

            // Changelog and git operations
            createGenerateChangelogTask(),
            createStageChangesTask(),
            createCommitChangesTask(),
            createCreateTagTask(),
            createPushCommitTask(),
            createPushTagTask(),

            // GitHub release
            createPublishGitHubReleaseTask(),
        ];

        const combined = Result.combine(taskResults);
        if (combined.isErr()) {
            return errAsync(combined.error);
        }

        return okAsync(combined.value);
    },
});
