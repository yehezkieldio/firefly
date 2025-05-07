import { type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { generateVersion } from "#/infrastructure/versioning/strategy";

export function promptVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return generateVersion(context);
}
