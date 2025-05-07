import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export function promptVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return okAsync(context);
}
