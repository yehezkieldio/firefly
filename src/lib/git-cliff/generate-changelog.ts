import { okAsync, ResultAsync } from "neverthrow";
import { fs } from "#/lib/fs";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function generateChangelog(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return handleFileCreation(context).andThen(() => okAsync(context));
}

function handleFileCreation(context: ArtemisContext): ResultAsync<boolean, Error> {
    return fs.createIfNotExists(context.config.changelogPath || "CHANGELOG.md").mapErr((error: Error): Error => {
        logger.error("Error creating changelog file:", error);
        return error;
    });
}
