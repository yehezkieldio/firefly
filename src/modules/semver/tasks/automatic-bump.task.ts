import { colors } from "consola/utils";
import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { taskRef } from "#/modules/orchestration/utils/task-ref.util";
import { BUMP_STRATEGY_AUTO } from "#/modules/semver/constants/bump-strategy.constant";
import { SemanticVersionService } from "#/modules/semver/services/semantic-version.service";
import {
    type VersionDecisionOptions,
    VersionResolverService,
} from "#/modules/semver/services/version-resolver.service";
import { BumpVersionTask } from "#/modules/semver/tasks/bump-version.task";
import { ExecuteBumpStrategyTask } from "#/modules/semver/tasks/execute-bump-strategy.task";
import { Version } from "#/modules/semver/version.domain";
import { logger } from "#/shared/logger";
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

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const currentVersion = Version.from(context.getCurrentVersion());
        if (currentVersion.isErr()) return errAsync(currentVersion.error);

        const options: VersionDecisionOptions = {
            currentVersion: currentVersion.value,
            releaseType: context.getConfig().releaseType,
            prereleaseIdentifier: context.getConfig().preReleaseId,
            prereleaseBase: context.getConfig().preReleaseBase,
        };

        // TODO: Allow customization of the semantic version service via config
        // Currently we use default settings, but in the future we might want to allow users
        // to specify additional commit types or scope rules.
        const semanticVersionService = new SemanticVersionService();
        const recommendVersion = ResultAsync.fromPromise(semanticVersionService.recommendVersion(), toFireflyError);

        return recommendVersion.andThen((recommendation) => {
            if (recommendation.isErr()) {
                return errAsync(recommendation.error);
            }

            const { reason } = recommendation.value;
            if (reason) {
                if (reason.startsWith("Analysis found:")) {
                    const prefix = "Analysis found:";
                    const details = reason.slice(prefix.length).trim();
                    logger.info(`${prefix} ${colors.bold(details)}`);
                } else {
                    logger.info(reason);
                }
            }

            const decision = VersionResolverService.decideNextVersion(options, recommendation.value);
            if (decision.isErr()) {
                return errAsync(decision.error);
            }

            context.setNextVersion(decision.value.raw);
            logger.verbose(`AutomaticBumpTask: From '${currentVersion.value.raw}' to '${decision.value.raw}'`);
            return okAsync();
        });
    }
}
