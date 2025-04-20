import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import { executeGit } from "#/lib/git";
import { generateChangelog } from "#/lib/git-cliff/generate";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function generateChangelogPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return generateChangelog(context);
}

export function rollbackChangelogPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would rollback changelog changes ${colors.yellow("(dry run)")}`);
        return okAsync(undefined);
    }

    const changelogPath: string = context.config.changelogPath || "CHANGELOG.md";
    return executeGit(["checkout", "HEAD", "--", changelogPath])
        .andTee((): void => {
            logger.info("Rolled back changelog changes");
        })
        .map(() => undefined)
        .mapErr((error: Error) => {
            logger.error("Error rolling back changelog:", error);
            return error;
        });
}
