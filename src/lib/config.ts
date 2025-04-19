import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { ResultAsync } from "neverthrow";
import { createDefaultConfiguration } from "#/context";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisConfiguration } from "#/types";

export function getFileConfiguration(): ResultAsync<ArtemisConfiguration, Error> {
    return ResultAsync.fromPromise(
        loadConfig<ArtemisConfiguration>({
            name: "artemis",
            defaults: createDefaultConfiguration()
        }),
        (e: unknown): Error => createErrorFromUnknown(e, "Failed to load configuration")
    ).map((config: ResolvedConfig<ArtemisConfiguration, ConfigLayerMeta>): ArtemisConfiguration => config.config);
}
