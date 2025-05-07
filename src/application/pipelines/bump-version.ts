import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function bumpVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackBumpVersionPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    return okAsync(undefined);
}
