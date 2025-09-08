import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { ChangelogFlowControllerTask } from "#/modules/orchestration/tasks";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BumpStrategyPrompter } from "#/modules/semver/prompters/bump-strategy.prompter";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { InitializeCurrentVersionTask } from "#/modules/semver/tasks/initialize-current-version.task";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PromptBumpStrategyTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prompt-bump-strategy";
    readonly description = "Prompts the user to select a bump strategy (manual or automatic) if none is specified.";

    getDependencies(): string[] {
        return [taskRef(InitializeCurrentVersionTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();

        if (config.skipBump) {
            return ok(false);
        }

        return ok(!(Boolean(config.bumpStrategy) || Boolean(config.releaseType)));
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(ExecuteBumpStrategyTask)]);
    }

    getSkipThroughTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        if (config.skipBump) {
            return ok([taskRef(ChangelogFlowControllerTask)]);
        }
        return ok([taskRef(ExecuteBumpStrategyTask)]);
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const prompter = new BumpStrategyPrompter();

        return ResultAsync.fromPromise(prompter.run(), (e) => toFireflyError(e)).andThen((choice) => {
            const config = context.getConfig();
            if (choice.isErr()) {
                return errAsync(choice.error);
            }

            config.bumpStrategy = choice.value as typeof config.bumpStrategy;
            return okAsync();
        });
    }
}
