import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function pushChangesPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackPushChangesPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}
