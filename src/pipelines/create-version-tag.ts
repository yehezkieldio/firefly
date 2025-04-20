import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import { resolveTagName, resolveTagNameAnnotation } from "#/lib/config";
import { executeGit } from "#/lib/git";
import { logger } from "#/lib/logger";
import type { ArtemisContext } from "#/types";

export function createVersionTagPipeline(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    return createTag(context)
        .andThen((): ResultAsync<ArtemisContext, Error> => {
            if (context.options.dryRun) {
                logger.info("Would create tag", context.config.tagName);
                return okAsync(context);
            }
            return okAsync(context);
        })
        .map((): ArtemisContext => {
            logger.info("Created tag", context.config.tagName);
            return context;
        });
}

export function rollbackVersionTagPipeline(context: ArtemisContext): ResultAsync<void, Error> {
    if (context.options.dryRun) {
        logger.info(`Would rollback tag ${context.config.tagName} ${colors.yellow(" (dry run)")}`);
        return okAsync(undefined);
    }

    const tagName: string = resolveTagName(context);

    return executeGit(["tag", "-d", tagName])
        .andTee((): void => {
            logger.info("Rolled back tag", tagName);
        })
        .map((): void => undefined);
}

function createTag(context: ArtemisContext) {
    const tagName: string = resolveTagName(context);
    const tagMessage: string = resolveTagNameAnnotation(context);

    return canSignGitTag()
        .map((canSign: boolean): string[] => {
            logger.verbose("Can sign tag:", canSign);
            const baseArgs: string[] = ["tag", "-a", tagName, "-m", tagMessage];
            return canSign ? [...baseArgs, "-s"] : baseArgs;
        })
        .andThen((args: string[]): ResultAsync<string, Error> => executeGit(args));
}

function canSignGitTag(): ResultAsync<boolean, Error> {
    return executeGit(["config", "--get", "user.signingkey"]).map((key: string): boolean => {
        if (key.trim() === "") {
            return false;
        }
        return true;
    });
}
