import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/types";

export function preflightPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}
