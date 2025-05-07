import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { generateChangelog } from "#/infrastructure/changelog/git-cliff";
import { executeGit } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";

export function generateChangelogPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return generateChangelog(context);
}

export function rollbackGenerateChangelogPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would rollback changelog changes ${colors.yellow("(dry run)")}`);
        return okAsync(undefined);
    }

    const changelogPath: string = context.options.changelogPath || "CHANGELOG.md";
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
