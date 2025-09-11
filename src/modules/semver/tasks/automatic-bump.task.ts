import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_AUTO } from "#/modules/semver/constants/bump-strategy.constant";
import { SemanticVersionService } from "#/modules/semver/services/semantic-version.service";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class AutomaticBumpTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "automatic-bump";
    readonly description = "Uses semantic analysis to determine the next version bump";

    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }

    shouldExecute(context: ReleaseTaskContext): FireflyResult<boolean> {
        const config = context.getConfig();
        return ok(config.bumpStrategy === BUMP_STRATEGY_AUTO);
    }

    getNextTasks(): FireflyResult<string[]> {
        return ok([taskRef(BumpVersionTask)]);
    }

    execute(_context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const semanticVersionService = new SemanticVersionService();

        return ResultAsync.fromPromise(semanticVersionService.recommendVersion(), toFireflyError).andThen(
            (recommendedVersion) => {
                if (recommendedVersion.isErr()) {
                    return errAsync(recommendedVersion.error);
                }

                console.log(`Recommended version bump: ${JSON.stringify(recommendedVersion.value)}`);
                return okAsync();
            },
        );
    }
}
