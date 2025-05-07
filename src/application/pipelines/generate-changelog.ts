import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function generateChangelogPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}

export function rollbackGenerateChangelogPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    return okAsync(undefined);
}
