import { LogLevels } from "consola";
import type { ReleaseContext } from "#/commands/release/release.context";
import {
    FireflyErrAsync,
    FireflyOkAsync,
    failedErrAsync,
    validationErr,
    validationErrAsync,
} from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { wrapPromise } from "#/core/result/result.utilities";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { BUMP_STRATEGY_MANUAL } from "#/domain/semver/semver.strategies";
import { Version } from "#/domain/semver/version";
import { logger } from "#/infrastructure/logging";
import type { VersionChoice as PromptSelectChoice } from "#/services/contracts/version-strategy.interface";

/**
 * Parses the current version from a raw string.
 *
 * @param currentVersionRaw - The raw string representing the current version
 * @returns A FireflyResult containing the parsed Version or a validation error
 */
function parseCurrentVersion(currentVersionRaw: string | undefined): FireflyResult<Version> {
    if (!currentVersionRaw) {
        return validationErr({
            message: "Current version is undefined",
        });
    }

    return Version.from(currentVersionRaw);
}

/**
 * Generates version choices and prompts the user to select one.
 */
function promptForManualVersion(ctx: ReleaseContext): FireflyAsyncResult<string> {
    const currentVersionResult = parseCurrentVersion(ctx.data.currentVersion);
    if (currentVersionResult.isErr()) return FireflyErrAsync(currentVersionResult.error);

    const currentVersion = currentVersionResult.value;

    logger.verbose("PromptManualVersionTask: Generating version choices...");

    return ctx.services.versionStrategy
        .generateChoices({
            currentVersion,
            preReleaseId: ctx.config.preReleaseId,
            preReleaseBase: ctx.config.preReleaseBase,
        })
        .andThen((choices) => {
            if (!choices || choices.length === 0) {
                return validationErrAsync({
                    message: "No version choices available",
                });
            }

            logger.verbose(`PromptManualVersionTask: Generated ${choices.length} version choices.`);

            const defaultChoice = choices[0];

            const prompt = logger.prompt("Select version to release", {
                type: "select",
                options: choices as unknown as PromptSelectChoice[],
                initial: defaultChoice?.value,
                cancel: "undefined",
            });

            return wrapPromise(prompt).andThen((selected) => {
                if (!selected || selected === "") {
                    return failedErrAsync({
                        message: "Operation cancelled by user",
                    });
                }

                if (logger.level === LogLevels.verbose) logger.log("");
                if (logger.level !== LogLevels.verbose) logger.log("");

                logger.verbose(`PromptManualVersionTask: Selected version: '${selected}'`);
                return FireflyOkAsync(selected);
            });
        });
}

export function createPromptManualVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-manual-version")
        .description("Prompts the user to manually select the next version")
        .dependsOn("delegate-bump-strategy")
        .skipWhenWithReason((ctx) => {
            const bumpStrategy = ctx.data.selectedBumpStrategy ?? ctx.config.bumpStrategy;
            return ctx.config.skipBump || bumpStrategy !== BUMP_STRATEGY_MANUAL;
        }, "Skipped: skipBump enabled or bumpStrategy is not 'manual'")
        .execute((ctx) =>
            promptForManualVersion(ctx).andThen((selectedVersion) =>
                FireflyOkAsync(ctx.fork("nextVersion", selectedVersion))
            )
        )
        .build();
}
