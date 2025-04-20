import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import { fs } from "#/lib/fs";
import { generateChangelog } from "#/lib/git-cliff/generate";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

const CHANGELOG_BACKUP_SUFFIX = ".bak";

export function generateChangelogPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return backupChangelog(context).andThen(() => generateChangelog(context));
}

export function rollbackChangelogPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    const changelogPath: string = context.config.changelogPath || "CHANGELOG.md";
    const backupPath = `${changelogPath}${CHANGELOG_BACKUP_SUFFIX}`;

    return fs
        .fileExists(backupPath)
        .andThen((exists: boolean) => {
            if (!exists) {
                return okAsync(undefined);
            }

            return fs
                .getTextFromFile(backupPath)
                .andThen((content: string): ResultAsync<number, Error> => fs.writeContentToFile(changelogPath, content))
                .andThen((): ResultAsync<number, Error> => fs.writeContentToFile(backupPath, "")) // Clear the backup file
                .andTee((): void => {
                    const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";
                    logger.info(`Rolled back changelog changes${dryRunIndicator}`);
                })
                .map(() => undefined);
        })
        .mapErr((error: Error) => {
            logger.error("Error rolling back changelog:", error);
            return error;
        });
}

function backupChangelog(context: ArtemisContext): ResultAsync<void, Error> {
    const changelogPath: string = context.config.changelogPath || "CHANGELOG.md";
    const backupPath = `${changelogPath}${CHANGELOG_BACKUP_SUFFIX}`;

    return fs.fileExists(changelogPath).andThen((exists: boolean): ResultAsync<undefined, Error> => {
        if (!exists) {
            return okAsync(undefined);
        }

        return fs
            .getTextFromFile(changelogPath)
            .andThen((content: string): ResultAsync<number, Error> => fs.writeContentToFile(backupPath, content))
            .map((): undefined => undefined);
    });
}
