import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_MANUAL } from "#/modules/semver/constants/bump-strategy.constant";
import { VersionChoicePrompter } from "#/modules/semver/prompters/version-choice.prompter";
import { type VersionChoicesArgs, VersionChoicesService } from "#/modules/semver/services/version-choices.service";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { Version } from "#/modules/semver/version.domain";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptManualVersionTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-manual-version";
    readonly description = "Prompts the user to manually enter the desired version";

    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(config.bumpStrategy === BUMP_STRATEGY_MANUAL);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(BumpVersionTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const currentVersion = context.get("currentVersion");
        if (currentVersion.isErr()) return errAsync(currentVersion.error);

        const versionResult = Version.from(currentVersion.value || "");
        if (versionResult.isErr()) return errAsync(versionResult.error);

        const prompter = new VersionChoicePrompter(new VersionChoicesService());

        const config = context.getConfig();
        const options: VersionChoicesArgs = {
            currentVersion: versionResult.value,
            releaseType: config.releaseType,
            prereleaseIdentifier: config.preReleaseId,
            prereleaseBase: config.preReleaseBase,
        };

        return ResultAsync.fromPromise(prompter.run(options), (e) => toFireflyError(e)).andThen((choice) => {
            if (choice.isErr()) {
                return errAsync(choice.error);
            }

            context.setNextVersion(choice.value);
            return okAsync();
        });
    }
}
