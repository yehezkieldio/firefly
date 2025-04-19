import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/types";

export function createVersionTagPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}
