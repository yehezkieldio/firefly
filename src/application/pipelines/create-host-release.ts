import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function createHostReleasePipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackCreateHostReleasePipeline(context: ArtemisContext): ResultAsync<void, Error> {
    return okAsync(undefined);
}
