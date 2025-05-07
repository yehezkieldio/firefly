import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { resolveCommitMessage } from "#/infrastructure/config";
import { executeGit } from "#/infrastructure/git";
import { logger } from "#/infrastructure/logging";

export function createCommitPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.dryRun) {
        logger.info(`Staged all ${colors.dim("files")} for commit${colors.yellow(" (dry run)")}`);
        logger.info(
            `Created commit with message: ${colors.dim(resolveCommitMessage(context))} ${colors.yellow(" (dry run)")}`
        );
        return okAsync(context);
    }
    return stageFiles(context).andThen(createCommit);
}

function createCommit(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const commitMessage: string = resolveCommitMessage(context);
    const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";

    return executeGit(["commit", "-m", commitMessage])
        .andTee((): void => logger.info(`Created commit with message: ${colors.dim(commitMessage)}${dryRunIndicator}`))
        .map((): ArtemisContext => context);
}

function stageFiles(context: ArtemisContext) {
    const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";
    return executeGit(["add", "."])
        .andTee((): void => logger.info(`Staged all ${colors.dim("files")} for commit${dryRunIndicator}`))
        .map((): ArtemisContext => context);
}

export function rollbackCreateCommitPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would rollback commit ${colors.yellow(" (dry run)")}`);
        return okAsync(undefined);
    }

    return executeGit(["reset", "--mixed", "HEAD~1"])
        .andTee((): void => {
            const dryRunIndicator: string = context.options.dryRun ? colors.yellow(" (dry run)") : "";
            logger.info(`Rolled back commit${dryRunIndicator}`);
        })
        .map((): void => undefined);
}
