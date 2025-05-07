import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function createCommitPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackCreateCommitPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}
