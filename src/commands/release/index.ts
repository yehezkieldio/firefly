import { errAsync, okAsync, Result } from "neverthrow";
import { createCommand } from "#/command-registry/command-types";
import { type ReleaseConfig, ReleaseConfigSchema } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import { createInitializeVersionTask } from "#/commands/release/tasks/initialize-version";
import { createReleasePreflightTask } from "#/commands/release/tasks/preflight";
import { createPrepareConfigTask } from "#/commands/release/tasks/prepare-config";
import { createPromptBumpStrategyTask } from "#/commands/release/tasks/prompt-bump";
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
            createReleasePreflightTask(() => context.config.skipPreflightCheck === true),
            createPrepareConfigTask(),
            createInitializeVersionTask(),
            createStraightBumpTask(),
            createPromptBumpStrategyTask(),
        ];

        const combined = Result.combine(taskResults);
        if (combined.isErr()) {
            return errAsync(combined.error);
        }

        return okAsync(combined.value);
    },
});
