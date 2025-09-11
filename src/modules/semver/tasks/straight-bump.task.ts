import { errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask, VersionFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import {
    type VersionDecisionOptions,
    VersionResolverService,
} from "#/modules/semver/services/version-resolver.service";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { Version } from "#/modules/semver/version.domain";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class StraightBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "straight-bump";
    readonly description = "Handles version bump from provided release type.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        if (config.releaseType !== undefined) {
            return ok(true);
        }

        return ok(false);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(BumpVersionTask)]);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }
        return ok([taskRef(VersionFlowControllerTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const currentVersion = Version.from(context.getCurrentVersion());
        if (currentVersion.isErr()) return errAsync(currentVersion.error);

        const options: VersionDecisionOptions = {
            currentVersion: currentVersion.value,
            releaseType: context.getConfig().releaseType,
            prereleaseIdentifier: context.getConfig().preReleaseId,
            prereleaseBase: context.getConfig().preReleaseBase,
        };

        const decision = VersionResolverService.decideNextVersion(options);
        if (decision.isErr()) {
            return errAsync(decision.error);
        }

        context.setNextVersion(decision.value.raw);

        return okAsync();
    }

    canUndo(): boolean {
        return false;
    }
}
