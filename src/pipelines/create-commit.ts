import { colors } from "consola/utils";
import { type ResultAsync } from "neverthrow";
import { resolveCommitMessage } from "#/lib/config";
import { executeGit } from "#/lib/git";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function createCommitPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return stageFiles(context).andThen(createCommit);
}

function createCommit(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    const commitMessage: string = resolveCommitMessage(context);

    return executeGit(["commit", "-m", commitMessage])
        .andTee((): void => logger.info(`Created commit with message: ${colors.dim(commitMessage)}`))
        .map((): ArtemisContext => context);
}

function stageFiles(context: ArtemisContext) {
    return executeGit(["add", "."])
        .andTee((): void => logger.info("Staged all files for commit"))
        .map((): ArtemisContext => context);
}
