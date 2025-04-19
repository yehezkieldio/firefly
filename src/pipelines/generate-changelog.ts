import type { ResultAsync } from "neverthrow";
import { generateChangelog } from "#/lib/git-cliff/generate";
import type { ArtemisContext } from "#/types";

export function generateChangelogPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return generateChangelog(context);
}
