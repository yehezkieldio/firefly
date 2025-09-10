import { ResultAsync, errAsync, ok, okAsync } from "neverthrow";
import type { ReleaseTaskContext } from "#/application/context";
import { ConfigHydratorService } from "#/modules/configuration/config-hydrator.service";
import type { ConditionalTask } from "#/modules/orchestration/contracts/task.interface";
import { logger } from "#/shared/logger";
import { toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class PrepareReleaseConfigTask implements ConditionalTask<ReleaseTaskContext> {
    readonly id = "prepare-release-config";
    readonly description = "Hydrates and prepares the release configuration.";

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    canUndo(): boolean {
        return false;
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        logger.verbose("PrepareReleaseConfigTask: Preparing and hydrating release configuration...");

        const basePath = context.get("basePath");
        if (basePath.isErr()) return errAsync(basePath.error);

        const configHydrator = new ConfigHydratorService(basePath.value);

        const existingConfigRes = context.get("config");
        if (existingConfigRes.isErr()) return errAsync(existingConfigRes.error);

        const existingConfig = existingConfigRes.value ?? {};

        return ResultAsync.fromPromise(configHydrator.hydrateConfig(existingConfig), toFireflyError)
            .andThen((hydratedConfig) => {
                if (hydratedConfig.isErr()) {
                    return errAsync(hydratedConfig.error);
                }

                const setConfigRes = context.set("config", hydratedConfig.value);
                if (setConfigRes.isErr()) return errAsync(setConfigRes.error);

                return okAsync();
            })
            .andTee(() => logger.verbose("PrepareReleaseConfigTask: Release configuration prepared."));
    }
}
