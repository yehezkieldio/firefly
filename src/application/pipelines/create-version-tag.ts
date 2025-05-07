import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function createVersionTagPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackCreateVersionTagPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    return okAsync(undefined);
}
