import type { ResultAsync } from "neverthrow";
import { generateVersion } from "#/lib/semver";
import type { ArtemisContext } from "#/types";

export function promptVersionPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return generateVersion(context);
}
